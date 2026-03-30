import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const addHTMLFile = vi.fn().mockResolvedValue({ errors: [] });
const writeFiles = vi.fn().mockResolvedValue({ errors: [] });

vi.mock('pagefind', () => ({
  createIndex: vi.fn().mockResolvedValue({
    index: {
      addHTMLFile,
      writeFiles,
    },
    errors: [],
  }),
}));

const { buildPagefindIndex } = await import('../../src/search/pagefind-index.js');

describe('buildPagefindIndex', () => {
  let root: string;

  beforeEach(() => {
    root = join(tmpdir(), `litmdx-pagefind-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    addHTMLFile.mockClear();
    writeFiles.mockClear();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('indexes rewritten app routes instead of raw /home file paths', async () => {
    const docsDir = join(root, 'docs');
    const outDir = join(root, 'dist');

    mkdirSync(join(docsDir, 'home', 'features'), { recursive: true });

    writeFileSync(join(docsDir, 'home', 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');
    writeFileSync(
      join(docsDir, 'home', 'features', 'webmcp.mdx'),
      '---\ntitle: WebMCP\n---\n# WebMCP\n',
      'utf8',
    );

    await buildPagefindIndex(docsDir, outDir);

    expect(addHTMLFile).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/' }),
    );
    expect(addHTMLFile).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/features/webmcp' }),
    );
    expect(addHTMLFile).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: '/home/features/webmcp' }),
    );
  });

  it('skips loose root files in multi-section mode because they are not routable', async () => {
    const docsDir = join(root, 'docs');
    const outDir = join(root, 'dist');

    mkdirSync(join(docsDir, 'home'), { recursive: true });
    writeFileSync(join(docsDir, 'home', 'index.mdx'), '---\ntitle: Home\n---\n# Home\n', 'utf8');
    writeFileSync(join(docsDir, 'loose.mdx'), '---\ntitle: Loose\n---\n# Loose\n', 'utf8');

    await buildPagefindIndex(docsDir, outDir);

    const urls = addHTMLFile.mock.calls.map((call) => call[0]?.url);
    expect(urls).toContain('/');
    expect(urls).not.toContain('/loose');
  });
});