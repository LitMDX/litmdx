/**
 * Unit tests for parseMdxSource() in src/search/mdx-parser.ts.
 *
 * These tests are pure (no file I/O) and cover the content extraction logic
 * that was previously only exercisable through the full buildDocsIndex pipeline.
 */
import { describe, expect, it } from 'vitest';
import { parseMdxSource } from '../../src/search/mdx-parser.js';

// ---------------------------------------------------------------------------
// Frontmatter extraction
// ---------------------------------------------------------------------------

describe('parseMdxSource — frontmatter', () => {
  it('extracts title and description from frontmatter', () => {
    const { title, description } = parseMdxSource(
      '---\ntitle: My Page\ndescription: A short summary.\n---\n\nBody.',
    );
    expect(title).toBe('My Page');
    expect(description).toBe('A short summary.');
  });

  it('handles quoted description values', () => {
    const { description } = parseMdxSource(
      '---\ntitle: Test\ndescription: "Quoted, with comma."\n---\n\nBody.',
    );
    expect(description).toBe('Quoted, with comma.');
  });

  it('falls back to H1 when frontmatter has no title', () => {
    const { title } = parseMdxSource('# Heading Title\n\nSome content.');
    expect(title).toBe('Heading Title');
  });

  it('falls back to the provided fallbackName when there is no title or H1', () => {
    const { title } = parseMdxSource('Just prose, no heading.', 'my-page');
    expect(title).toBe('my-page');
  });

  it('falls back to "Untitled" when no fallbackName is given and no title exists', () => {
    const { title } = parseMdxSource('Just prose.');
    expect(title).toBe('Untitled');
  });

  it('content does not include the frontmatter block', () => {
    const { content } = parseMdxSource(
      '---\ntitle: FM\ndescription: Desc.\n---\n\nActual content.',
    );
    expect(content).not.toContain('---');
    expect(content).toContain('Actual content');
  });

  it('preserves the raw source unchanged', () => {
    const source = '---\ntitle: Raw Test\n---\n\n# Raw Test\n\nBody.';
    expect(parseMdxSource(source).raw).toBe(source);
  });
});

// ---------------------------------------------------------------------------
// Code block stripping (must run BEFORE JSX stripping — Bug #1 fix)
// ---------------------------------------------------------------------------

describe('parseMdxSource — code block stripping', () => {
  it('removes 3-backtick fenced code blocks', () => {
    const { content } = parseMdxSource('# Title\n\nIntro.\n\n```ts\nconst x = 1;\n```\n\nAfter.');
    expect(content).not.toContain('const x = 1');
    expect(content).not.toContain('```');
    expect(content).toContain('Intro');
    expect(content).toContain('After');
  });

  it('removes 4-backtick fences that wrap 3-backtick inner blocks', () => {
    const { content } = parseMdxSource(
      '# Title\n\nBefore.\n\n````mdx\n```ts\nconst x = 1;\n```\n````\n\nAfter.',
    );
    expect(content).not.toContain('const x = 1');
    expect(content).not.toContain('`');
    expect(content).toContain('Before');
    expect(content).toContain('After');
  });

  it('does not swallow content that follows a JSX block after a code block', () => {
    // Regression: if JSX stripping ran BEFORE code-block stripping, the
    // <Callout> inside the ``` fence confused the block-level JSX regex.
    const { content } = parseMdxSource(
      [
        '# Title',
        '',
        '```mdx',
        '<Callout>Example usage</Callout>',
        '```',
        '',
        '<Callout>',
        'This Callout block will be stripped (expected).',
        '</Callout>',
        '',
        'Trailing prose that must survive.',
      ].join('\n'),
    );
    expect(content).toContain('Trailing prose that must survive');
    expect(content).not.toContain('Example usage');
    expect(content).not.toMatch(/<[A-Z]/);
  });
});

// ---------------------------------------------------------------------------
// JSX stripping (block-level ^ anchor prevents table-cell matches — Bug #2 fix)
// ---------------------------------------------------------------------------

describe('parseMdxSource — JSX stripping', () => {
  it('removes block-level self-closing JSX components', () => {
    const { content } = parseMdxSource('# Title\n\n<Banner />\n\nProse.');
    expect(content).not.toMatch(/<[A-Z]/);
    expect(content).toContain('Prose');
  });

  it('removes block-level JSX components with children', () => {
    const { content } = parseMdxSource(
      '# Title\n\n<Callout type="tip">\nHelpful note.\n</Callout>\n\nAfter callout.',
    );
    expect(content).not.toMatch(/<[A-Z]/);
    expect(content).toContain('After callout');
  });

  it('removes multi-paragraph JSX blocks', () => {
    const { content } = parseMdxSource(
      '# Title\n\n<Tabs>\n<Tab label="A">\n\nContent A.\n\n</Tab>\n<Tab label="B">\n\nContent B.\n\n</Tab>\n</Tabs>\n\nEnd.',
    );
    expect(content).not.toMatch(/<[A-Z]/);
    expect(content).toContain('End');
  });

  it('does NOT strip inline component references inside table cells', () => {
    // Without ^ anchor, <Mermaid> in a table cell swallowed the real block.
    const { content } = parseMdxSource(
      [
        '# Title',
        '',
        '| Component | Notes |',
        '|---|---|',
        '| <Mermaid> | opt-in |',
        '',
        'Some prose after the table.',
      ].join('\n'),
    );
    expect(content).toContain('opt-in');
    expect(content).toContain('Some prose after the table');
    expect(content).not.toMatch(/<[A-Z]/);
  });

  it('strips residual inline JSX tags inside table cells', () => {
    const { content } = parseMdxSource(
      '# Title\n\n| Component | Size |\n|---|---|\n| <Mermaid> | 500 KB |\n',
    );
    expect(content).not.toContain('<Mermaid>');
    expect(content).toContain('500 KB');
  });
});

// ---------------------------------------------------------------------------
// Markdown syntax stripping
// ---------------------------------------------------------------------------

describe('parseMdxSource — markdown syntax stripping', () => {
  it('strips bold, italic, and inline code', () => {
    const { content } = parseMdxSource('# Title\n\n**bold** _italic_ `code`.');
    expect(content).toContain('bold italic code');
    expect(content).not.toContain('**');
    expect(content).not.toContain('_italic_');
  });

  it('strips markdown links but keeps the label', () => {
    const { content } = parseMdxSource('# Title\n\nSee [the guide](/guide) for details.');
    expect(content).toContain('the guide');
    expect(content).not.toContain('(/guide)');
  });

  it('strips list markers', () => {
    const { content } = parseMdxSource(
      '# Title\n\n- Item A\n- Item B\n\n1. First\n2. Second',
    );
    expect(content).toContain('Item A');
    expect(content).toContain('First');
    expect(content).not.toMatch(/^- /m);
    expect(content).not.toMatch(/^\d+\. /m);
  });

  it('strips import and export statements', () => {
    const { content } = parseMdxSource(
      "import Foo from './foo.js';\nexport { Foo };\n\n# Title\n\nContent.",
    );
    expect(content).not.toContain('import');
    expect(content).not.toContain('export');
    expect(content).toContain('Content');
  });
});
