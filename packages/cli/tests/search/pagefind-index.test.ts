/**
 * Integration tests for buildPagefindIndex (Pagefind API wiring).
 *
 * Route rewriting logic is tested in isolation in tests/search/route-resolver.test.ts.
 * Content parsing logic is tested in isolation in tests/search/mdx-parser.test.ts.
 * These tests focus on how buildPagefindIndex interacts with the Pagefind NodeJS API.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const addHTMLFile = vi.fn().mockResolvedValue({ errors: [] });
const writeFiles = vi.fn().mockResolvedValue({ errors: [] });
const mockCreateIndex = vi.fn().mockResolvedValue({
  index: { addHTMLFile, writeFiles },
  errors: [],
});

vi.mock('pagefind', () => ({
  createIndex: (...args: unknown[]) => mockCreateIndex(...args),
}));

const { buildPagefindIndex } = await import('../../src/search/pagefind-index.js');

let root: string;

beforeEach(() => {
  root = join(tmpdir(), `litmdx-pagefind-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(root, { recursive: true });
  addHTMLFile.mockClear();
  writeFiles.mockClear();
  mockCreateIndex.mockClear();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Empty / missing docs
// ---------------------------------------------------------------------------

describe('buildPagefindIndex — empty docs', () => {
  it('does nothing when docsDir has no MDX files', async () => {
    const docsDir = join(root, 'docs');
    const outDir = join(root, 'dist');
    mkdirSync(docsDir, { recursive: true });

    await buildPagefindIndex(docsDir, outDir);

    expect(mockCreateIndex).not.toHaveBeenCalled();
    expect(addHTMLFile).not.toHaveBeenCalled();
  });

  it('does nothing when docsDir does not exist', async () => {
    await buildPagefindIndex(join(root, 'nonexistent'), join(root, 'dist'));
    expect(mockCreateIndex).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Pagefind API wiring
// ---------------------------------------------------------------------------

describe('buildPagefindIndex — Pagefind API wiring', () => {
  it('calls createIndex with forceLanguage: "en"', async () => {
    const docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');

    await buildPagefindIndex(docsDir, join(root, 'dist'));

    expect(mockCreateIndex).toHaveBeenCalledWith({ forceLanguage: 'en' });
  });

  it('calls addHTMLFile for each indexable MDX file', async () => {
    const docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');
    writeFileSync(join(docsDir, 'guide.mdx'), '---\ntitle: Guide\n---\n# Guide\n', 'utf8');

    await buildPagefindIndex(docsDir, join(root, 'dist'));

    expect(addHTMLFile).toHaveBeenCalledTimes(2);
  });

  it('passes url and content to addHTMLFile', async () => {
    const docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');

    await buildPagefindIndex(docsDir, join(root, 'dist'));

    expect(addHTMLFile).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.any(String), content: expect.any(String) }),
    );
  });

  it('calls writeFiles with outputPath inside outDir', async () => {
    const docsDir = join(root, 'docs');
    const outDir = join(root, 'dist');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');

    await buildPagefindIndex(docsDir, outDir);

    expect(writeFiles).toHaveBeenCalledWith(
      expect.objectContaining({ outputPath: join(outDir, 'pagefind') }),
    );
  });

  it('throws when createIndex returns errors', async () => {
    mockCreateIndex.mockResolvedValueOnce({
      index: null,
      errors: ['binary not found'],
    });

    const docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'index.mdx'), '# Home\n', 'utf8');

    await expect(buildPagefindIndex(docsDir, join(root, 'dist'))).rejects.toThrow(
      'Pagefind init errors',
    );
  });

  it('throws when writeFiles returns errors', async () => {
    writeFiles.mockResolvedValueOnce({ errors: ['disk full'] });

    const docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'index.mdx'), '# Home\n', 'utf8');

    await expect(buildPagefindIndex(docsDir, join(root, 'dist'))).rejects.toThrow(
      'Pagefind write errors',
    );
  });

  it('HTML content includes the page title', async () => {
    const docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'index.mdx'), '---\ntitle: My Title\n---\n# My Title\n', 'utf8');

    await buildPagefindIndex(docsDir, join(root, 'dist'));

    const html: string = addHTMLFile.mock.calls[0][0].content;
    expect(html).toContain('My Title');
    expect(html).toContain('data-pagefind-body');
  });
});

// ---------------------------------------------------------------------------
// Route rewriting integration (smoke tests — full coverage in route-resolver.test.ts)
// ---------------------------------------------------------------------------

describe('buildPagefindIndex — route rewriting', () => {
  it('uses rewritten app routes instead of raw /home file paths', async () => {
    const docsDir = join(root, 'docs');
    mkdirSync(join(docsDir, 'home', 'features'), { recursive: true });

    writeFileSync(join(docsDir, 'home', 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');
    writeFileSync(
      join(docsDir, 'home', 'features', 'webmcp.mdx'),
      '---\ntitle: WebMCP\n---\n# WebMCP\n',
      'utf8',
    );

    await buildPagefindIndex(docsDir, join(root, 'dist'));

    expect(addHTMLFile).toHaveBeenCalledWith(expect.objectContaining({ url: '/' }));
    expect(addHTMLFile).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/features/webmcp' }),
    );
    expect(addHTMLFile).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/home/features/webmcp' }),
    );
  });

  it('skips loose root files in multi-section mode', async () => {
    const docsDir = join(root, 'docs');
    mkdirSync(join(docsDir, 'home'), { recursive: true });
    writeFileSync(join(docsDir, 'home', 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');
    writeFileSync(join(docsDir, 'loose.mdx'), '---\ntitle: Loose\n---\n# Loose\n', 'utf8');

    await buildPagefindIndex(docsDir, join(root, 'dist'));

    const urls = addHTMLFile.mock.calls.map((call) => call[0]?.url);
    expect(urls).toContain('/');
    expect(urls).not.toContain('/loose');
  });
});