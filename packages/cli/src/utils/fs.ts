import path from 'path';
import { existsSync, readdirSync } from 'fs';

/**
 * Recursively collects all .md / .mdx file paths under `dir`.
 * Returns an empty array (without throwing) when `dir` does not exist.
 */
export function walkMdx(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMdx(full));
    } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Converts an absolute MDX file path to the import key used by
 * `import.meta.glob` in the browser bundle (e.g. `../docs/guide.mdx`).
 */
export function fileToImportKey(filePath: string, docsDir: string): string {
  return `../${path.relative(path.resolve(docsDir, '..'), filePath).replace(/\\/g, '/')}`;
}

/**
 * Converts an absolute MDX file path to its site route
 * (e.g. `docs/guide/index.mdx` → `/guide`).
 */
export function fileToRoute(filePath: string, docsDir: string): string {
  const relative = path
    .relative(docsDir, filePath)
    .replace(/\.mdx?$/, '')
    .replace(/\\/g, '/');
  if (relative === 'index') return '/';
  return '/' + relative.replace(/\/index$/, '');
}
