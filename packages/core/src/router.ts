/**
 * Resolves filesystem paths to URL routes.
 *
 * docs/index.mdx          → /
 * docs/guide.mdx          → /guide
 * docs/guide/install.mdx  → /guide/install
 */
export interface Route {
  path: string; // URL path, e.g. /guide/install
  filePath: string; // Absolute or relative file path
  importKey: string; // Key used in import.meta.glob map
  /** Assigned in multi-section mode (when docs/home/ exists). e.g. 'home' | 'community' */
  section?: string;
}

export function filePathToRoute(importKey: string): string {
  // Handles both absolute (/docs/...) and relative (../docs/...) glob keys
  const stripped = importKey
    .replace(/^.*\/docs\//, '') // strip everything up to and including docs/
    .replace(/\.mdx?$/, '');

  // index → root of that segment
  const route = stripped === 'index' ? '/' : `/${stripped.replace(/\/index$/, '')}`;
  return route;
}

export function buildRouteMap(globEntries: Record<string, () => Promise<unknown>>): Route[] {
  return Object.keys(globEntries).map((importKey) => ({
    path: filePathToRoute(importKey),
    filePath: importKey,
    importKey,
  }));
}

export function resolveRoutes(globEntries: Record<string, () => Promise<unknown>>): Route[] {
  const routes = buildRouteMap(globEntries);
  // Sort: root first, then alphabetically
  return routes.sort((a, b) => {
    if (a.path === '/') return -1;
    if (b.path === '/') return 1;
    return a.path.localeCompare(b.path);
  });
}
