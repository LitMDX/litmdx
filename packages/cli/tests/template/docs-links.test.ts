import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGroupRedirectPaths, resolveRoutes, rewriteHomeRoutes } from '../../template/src/lib/router.js';

const docsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'docs',
);

function walkMdxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkMdxFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.mdx') ? [entryPath] : [];
  });
}

function toImportKey(filePath: string): string {
  return `../${path.relative(path.resolve(docsRoot, '..'), filePath).replace(/\\/g, '/')}`;
}

function extractInternalAbsoluteLinks(source: string): string[] {
  const matches = source.matchAll(/\]\((\/[^)\s#]+)(?:#[^)\s]+)?\)|href=["'](\/[^"'#]+)(?:#[^"']+)?["']/g);
  return [...matches].map((match) => match[1] ?? match[2]).filter(Boolean);
}

describe('docs internal links', () => {
  it('only points to existing routes or supported group redirects', () => {
    const docsFiles = walkMdxFiles(docsRoot);
    const routes = rewriteHomeRoutes(
      resolveRoutes(
        Object.fromEntries(docsFiles.map((filePath) => [toImportKey(filePath), async () => ({})])),
      ),
    );

    const validPaths = new Set([
      ...routes.map((route) => route.path),
      ...getGroupRedirectPaths(routes),
    ]);

    const brokenLinks = docsFiles.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return extractInternalAbsoluteLinks(source)
        .filter((target) => !validPaths.has(target))
        .map((target) => `${path.relative(path.resolve(docsRoot, '..', '..'), filePath)} -> ${target}`);
    });

    expect(brokenLinks).toEqual([]);
  });
});