import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeGeneratedPageMeta } from '../../../src/vite/content/index.js';

const tmpRoot = join(tmpdir(), `litmdx-page-meta-test-${Date.now()}`);

beforeAll(() => mkdirSync(tmpRoot, { recursive: true }));
afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

describe('writeGeneratedPageMeta', () => {
  it('writes an empty metadata map when docsDir does not exist', () => {
    const dir = join(tmpRoot, `meta-empty-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });

    writeGeneratedPageMeta(dir, join(dir, 'missing-docs'));

    expect(readFileSync(join(dir, 'src', 'generated', 'page-meta.ts'), 'utf8')).toContain(
      'export const pageMeta = {} as const;',
    );
  });

  it('extracts allowed frontmatter keys and preserves number/boolean types', () => {
    const dir = join(tmpRoot, `meta-values-${Math.random().toString(36).slice(2)}`);
    const docsDir = join(dir, 'docs');
    mkdirSync(docsDir, { recursive: true });

    writeFileSync(
      join(docsDir, 'index.mdx'),
      [
        '---',
        'title: Home',
        'description: Landing',
        'sidebar_position: 2',
        'sidebar_collapsed: false',
        'sidebar_hidden: true',
        'unknown_key: ignored',
        '---',
        '# Home',
        '',
      ].join('\n'),
      'utf8',
    );

    writeGeneratedPageMeta(dir, docsDir);

    const output = readFileSync(join(dir, 'src', 'generated', 'page-meta.ts'), 'utf8');
    expect(output).toContain('../docs/index.mdx');
    expect(output).toContain('"title": "Home"');
    expect(output).toContain('"description": "Landing"');
    expect(output).toContain('"sidebar_position": 2');
    expect(output).toContain('"sidebar_collapsed": false');
    expect(output).toContain('"sidebar_hidden": true');
    expect(output).not.toContain('unknown_key');
  });
});
