/**
 * Route resolution for MDX files — shared by docs-index and pagefind indexers.
 *
 * Responsibilities (single):
 *   - Map a file path to its public site route
 *   - Handle the multi-section docs layout (docs/home/** → /**)
 *   - Determine which files are indexable in multi-section mode (pagefind)
 *
 * No file I/O, no content parsing — callers own those concerns.
 */

import { fileToRoute, fileToImportKey } from '../utils/fs.js';

// ---------------------------------------------------------------------------
// Single-file route (docs-index: all files included, /home rewritten)
// ---------------------------------------------------------------------------

/**
 * Returns the public route for a single MDX file.
 *
 * The `/home` prefix is always rewritten:
 *   docs/home/index.mdx        → /
 *   docs/home/basics/intro.mdx → /basics/intro
 *
 * All other files are mapped as-is by `fileToRoute`.
 * This function is intentionally simple: `buildDocsIndex` indexes every file
 * regardless of section structure so the agent has the full corpus.
 */
export function resolveDocRoute(filePath: string, docsDir: string): string {
  const route = fileToRoute(filePath, docsDir);
  if (route === '/home') return '/';
  if (route.startsWith('/home/')) return route.slice('/home'.length);
  return route;
}

// ---------------------------------------------------------------------------
// Multi-file indexed route map (pagefind: section-filtered, /home rewritten)
// ---------------------------------------------------------------------------

interface SearchRoute {
  path: string;
  importKey: string;
  section?: string;
}

/**
 * Returns `true` when the docs directory uses the multi-section layout
 * (i.e. it contains a `home/` subdirectory used as the landing section).
 */
export function isMultiSectionMode(routes: SearchRoute[]): boolean {
  return routes.some(
    (r) => r.section !== undefined || r.path === '/home' || r.path.startsWith('/home/'),
  );
}

/**
 * In multi-section mode, rewrites `/home/**` routes to `/**` and keeps only
 * files that belong to a top-level section directory.  Loose root-level files
 * (e.g. `docs/loose.mdx`) are excluded because they are not routable.
 *
 * In single-section mode the array is returned unchanged.
 */
export function rewriteHomeRoutes(routes: SearchRoute[]): SearchRoute[] {
  if (!isMultiSectionMode(routes)) return routes;

  const sectionKeys = new Set(
    routes
      .map((r) => r.path.split('/').filter(Boolean))
      .filter((segs) => segs.length >= 2)
      .map((segs) => segs[0]),
  );

  return routes.flatMap((route) => {
    const segs = route.path.split('/').filter(Boolean);

    if (segs[0] === 'home') {
      const rewrittenPath = segs.length === 1 ? '/' : `/${segs.slice(1).join('/')}`;
      return [{ ...route, path: rewrittenPath, section: 'home' }];
    }

    if (sectionKeys.has(segs[0])) {
      return [{ ...route, section: segs[0] }];
    }

    return [];
  });
}

/**
 * Returns a `Map<importKey, routeUrl>` for all indexable routes.
 *
 * In multi-section mode only section-scoped files are included; loose root
 * files are excluded.  Used by `buildPagefindIndex` to feed URLs to Pagefind.
 */
export function resolveIndexedRoutes(files: string[], docsDir: string): Map<string, string> {
  const routes = rewriteHomeRoutes(
    files
      .map((filePath) => ({
        path: fileToRoute(filePath, docsDir),
        importKey: fileToImportKey(filePath, docsDir),
      }))
      .sort((a, b) => {
        if (a.path === '/') return -1;
        if (b.path === '/') return 1;
        return a.path.localeCompare(b.path);
      }),
  );

  return new Map(routes.map((r) => [r.importKey, r.path]));
}
