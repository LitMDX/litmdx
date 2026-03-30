/**
 * Builds a Pagefind search index from MDX source files using the Pagefind NodeJS API.
 *
 * Because LitMDX generates a SPA (single index.html), Pagefind's CLI cannot crawl
 * per-route HTML. Instead we read the MDX sources directly, extract their text
 * content, synthesise minimal HTML pages and feed them to the Pagefind index API.
 */

import { createIndex } from 'pagefind';
import { readFileSync } from 'fs';
import path from 'path';
import { walkMdx, fileToImportKey, fileToRoute } from '../utils/fs.js';
import { escapeHtml } from '../utils/html.js';

// ---------------------------------------------------------------------------
// Route resolution (mirrors template route normalization)
// ---------------------------------------------------------------------------

interface SearchRoute {
  path: string;
  importKey: string;
  section?: string;
}

function isMultiSectionMode(routes: SearchRoute[]): boolean {
  return routes.some(
    (route) =>
      route.section !== undefined || route.path === '/home' || route.path.startsWith('/home/'),
  );
}

function rewriteHomeRoutes(routes: SearchRoute[]): SearchRoute[] {
  if (!isMultiSectionMode(routes)) return routes;

  const sectionKeys = new Set(
    routes
      .map((route) => route.path.split('/').filter(Boolean))
      .filter((segments) => segments.length >= 2)
      .map((segments) => segments[0]),
  );

  return routes.flatMap((route) => {
    const segments = route.path.split('/').filter(Boolean);

    if (segments[0] === 'home') {
      const rewrittenPath = segments.length === 1 ? '/' : `/${segments.slice(1).join('/')}`;
      return [{ ...route, path: rewrittenPath, section: 'home' }];
    }

    if (sectionKeys.has(segments[0])) {
      return [{ ...route, section: segments[0] }];
    }

    return [];
  });
}

function resolveIndexedRoutes(files: string[], docsDir: string): Map<string, string> {
  const routes = rewriteHomeRoutes(
    files
      .map((filePath) => ({
        path: fileToRoute(filePath, docsDir),
        importKey: fileToImportKey(filePath, docsDir),
      }))
      .sort((left, right) => {
        if (left.path === '/') return -1;
        if (right.path === '/') return 1;
        return left.path.localeCompare(right.path);
      }),
  );

  return new Map(routes.map((route) => [route.importKey, route.path]));
}

// ---------------------------------------------------------------------------
// MDX → plain text
// ---------------------------------------------------------------------------

interface Extracted {
  title: string;
  body: string;
}

function extractContent(source: string): Extracted {
  let content = source;
  let title = '';

  // Strip frontmatter and extract title
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const titleMatch = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch) title = titleMatch[1].trim();
    content = content.slice(fmMatch[0].length);
  }

  // Strip import / export statements
  content = content.replace(/^(import|export\s+(?:default\s+)?)[^\n]*\n?/gm, '');

  // Strip JSX component blocks: <Component>...</Component>
  content = content.replace(/<([A-Z][A-Za-z0-9.]*)(\s[^>]*)?>[\s\S]*?<\/\1>/g, '');

  // Strip self-closing JSX: <Component ... />
  content = content.replace(/<[A-Z][A-Za-z0-9.]*(?:\s[^>]*)?\s*\/>/g, '');

  // Strip remaining opening/closing JSX tags
  content = content.replace(/<\/?[A-Z][A-Za-z0-9.]*(?:\s[^>]*)?>/g, '');

  // Strip fenced code blocks (keep inner text stripped)
  content = content.replace(/```[\s\S]*?```/g, '');

  // Strip markdown syntax
  content = content
    .replace(/^#{1,6}\s+(.*)/gm, (_, t) => {
      if (!title) title = t.trim();
      return t;
    })
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/__(.+?)__/g, '$1') // bold alt
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/_(.+?)_/g, '$1') // italic alt
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*+]\s+/gm, '') // list items
    .replace(/^\d+\.\s+/gm, '') // ordered list
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^---+$/gm, '') // horizontal rules
    .trim();

  return { title: title || 'Untitled', body: content };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

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

    if (!url) {
      continue;
    }

    const { title, body } = extractContent(source);

    const html = `<!DOCTYPE html>
<html lang="en">
<head><title>${escapeHtml(title)}</title></head>
<body data-pagefind-body>
<h1>${escapeHtml(title)}</h1>
<div>${escapeHtml(body)}</div>
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
