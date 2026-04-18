/**
 * Writes `docs-index.json` for use by `@litmdx/agent`.
 *
 * Responsibility (single): orchestrate walkMdx → parseMdxSource → resolveDocRoute
 * and write the result to `<outDir>/docs-index.json`.
 *
 * Parsing logic lives in `./mdx-parser.ts`.
 * Route resolution lives in `./route-resolver.ts`.
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { walkMdx } from '../utils/fs.js';
import { parseMdxSource } from './mdx-parser.js';
import { resolveDocRoute } from './route-resolver.js';

// ---------------------------------------------------------------------------
// Domain type (mirrors @litmdx/agent PageEntry — kept in sync manually)
// ---------------------------------------------------------------------------

export interface PageEntry {
  path: string;
  title: string;
  description: string;
  /** Cleaned prose — no MDX/JSX/code-block syntax */
  content: string;
  /** Original .mdx source (used by the agent's get_page tool) */
  raw: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walks `docsDir`, parses every .mdx / .md file and writes
 * `<outDir>/docs-index.json`.
 *
 * Silently skips when `docsDir` does not exist (same behaviour as
 * `buildPagefindIndex`).
 */
export function buildDocsIndex(docsDir: string, outDir: string): void {
  const files = walkMdx(docsDir);
  if (files.length === 0) return;

  const entries: PageEntry[] = files.map((filePath) => {
    const raw = readFileSync(filePath, 'utf-8');
    const fallbackName = path.basename(filePath, path.extname(filePath));
    const parsed = parseMdxSource(raw, fallbackName);
    return {
      ...parsed,
      path: resolveDocRoute(filePath, docsDir),
    };
  });

  const dest = path.join(outDir, 'docs-index.json');
  writeFileSync(dest, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`  ✓ docs-index.json written (${entries.length} page(s))`);
}
