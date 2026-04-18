/**
 * Builds a Pagefind search index from MDX source files using the Pagefind NodeJS API.
 *
 * Responsibility (single): orchestrate walkMdx → resolveIndexedRoutes → parseMdxSource
 * and feed the results to the Pagefind NodeJS API.
 *
 * Because LitMDX generates a SPA (single index.html), Pagefind's CLI cannot crawl
 * per-route HTML. We read MDX sources directly, synthesise minimal HTML pages and
 * feed them to the Pagefind index API.
 *
 * Parsing logic lives in `./mdx-parser.ts`.
 * Route resolution lives in `./route-resolver.ts`.
 */

import { createIndex } from 'pagefind';
import { readFileSync } from 'fs';
import path from 'path';
import { walkMdx, fileToImportKey } from '../utils/fs.js';
import { escapeHtml } from '../utils/html.js';
import { parseMdxSource } from './mdx-parser.js';
import { resolveIndexedRoutes } from './route-resolver.js';

/**
 * Indexes all MDX files in `docsDir` with Pagefind's NodeJS API and writes
 * the search bundle to `<outDir>/pagefind`.
 */
export async function buildPagefindIndex(docsDir: string, outDir: string): Promise<void> {
  const files = walkMdx(docsDir);
  if (files.length === 0) return;

  const { index, errors: initErrors } = await createIndex({ forceLanguage: 'en' });

  if (initErrors.length > 0 || !index) {
    throw new Error(`Pagefind init errors: ${initErrors.join(', ')}`);
  }

  const routeMap = resolveIndexedRoutes(files, docsDir);

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf-8');
    const importKey = fileToImportKey(filePath, docsDir);
    const url = routeMap.get(importKey);

    if (!url) continue;

    const { title, content } = parseMdxSource(source);

    const html = `<!DOCTYPE html>
<html lang="en">
<head><title>${escapeHtml(title)}</title></head>
<body data-pagefind-body>
<h1>${escapeHtml(title)}</h1>
<div>${escapeHtml(content)}</div>
</body>
</html>`;

    const { errors } = await index.addHTMLFile({ url, content: html });
    if (errors.length > 0) {
      console.warn(`  pagefind: skipping ${url} — ${errors.join(', ')}`);
    }
  }

  const outputPath = path.join(outDir, 'pagefind');
  const { errors: writeErrors } = await index.writeFiles({ outputPath });

  if (writeErrors.length > 0) {
    throw new Error(`Pagefind write errors: ${writeErrors.join(', ')}`);
  }

  console.log(`  pagefind: indexed ${files.length} pages → ${outputPath}`);
}
