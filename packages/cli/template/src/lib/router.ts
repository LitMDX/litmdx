import type { Route, GlobMap, PageMetaMap } from './types';
import { normalizePathname, stripBaseUrl } from './urls';
export { normalizePathname } from './urls';

// ─── Route resolution ─────────────────────────────────────────────────────────

/** Maps an import.meta.glob key to a URL path. */
function importKeyToPath(importKey: string): string {
  const stripped = importKey.replace(/^.*\/docs\//, '').replace(/\.mdx?$/, '');
  return stripped === 'index' ? '/' : `/${stripped.replace(/\/index$/, '')}`;
}

/** Resolves a glob map to a sorted Route array (root first, then alphabetical). */
// Inline resolver — avoids importing @litmdx/core (which pulls Vite server plugins) in the browser
export function resolveRoutes(glob: GlobMap): Route[] {
  return Object.keys(glob)
    .map((importKey) => ({ path: importKeyToPath(importKey), importKey }))
    .sort((a, b) => {
      if (a.path === '/') return -1;
      if (b.path === '/') return 1;
      return a.path.localeCompare(b.path);
    });
}

// ─── Multi-section mode ───────────────────────────────────────────────────────

/**
 * Detects multi-section mode by checking if any route has a section assigned.
 * Called both before rewriting (checks /home paths) and after (checks section field).
 */
export function isMultiSectionMode(routes: Route[]): boolean {
  return routes.some(
    (r) => r.section !== undefined || r.path === '/home' || r.path.startsWith('/home/'),
  );
}

/**
 * Rewrites routes when multi-section mode is active:
 *   /home/overview  → /overview   (section: 'home')
 *   /home           → /           (section: 'home')
 *   /community/x    → /community/x (section: 'community')
 *
 * Loose root-level files (docs/index.mdx, docs/getting-started.mdx, etc.)
 * are excluded entirely — they have no section in multi-section mode.
 */
export function rewriteHomeRoutes(routes: Route[]): Route[] {
  if (!isMultiSectionMode(routes)) return routes;

  // Collect first segments that own child routes — those are the real section keys.
  const sectionKeys = new Set(
    routes
      .map((r) => r.path.split('/').filter(Boolean))
      .filter((segs) => segs.length >= 2)
      .map((segs) => segs[0]),
  );

  return routes.flatMap((route) => {
    const segs = route.path.split('/').filter(Boolean);

    if (segs[0] === 'home') {
      const newPath = segs.length === 1 ? '/' : `/${segs.slice(1).join('/')}`;
      return [{ ...route, path: newPath, section: 'home' }];
    }

    if (sectionKeys.has(segs[0])) {
      return [{ ...route, section: segs[0] }];
    }

    // Loose root-level files have no section — excluded in multi-section mode.
    return [];
  });
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/** Re-sorts routes using sidebar_position from frontmatter; falls back to alphabetical. */
export function sortRoutesByMeta(routes: Route[], meta: PageMetaMap): Route[] {
  return [...routes].sort((a, b) => {
    const posA = meta[a.importKey]?.sidebar_position ?? Infinity;
    const posB = meta[b.importKey]?.sidebar_position ?? Infinity;
    if (posA !== posB) return posA - posB;
    if (a.path === '/') return -1;
    if (b.path === '/') return 1;
    return a.path.localeCompare(b.path);
  });
}

function getRoutePrefixes(routePath: string): string[] {
  const segments = routePath.split('/').filter(Boolean);
  const prefixes: string[] = [];

  for (let index = 1; index < segments.length; index += 1) {
    prefixes.push(`/${segments.slice(0, index).join('/')}`);
  }

  return prefixes;
}

export function resolveGroupRedirect(pathname: string, routes: Route[]): string | undefined {
  const normalized = normalizePathname(pathname);
  if (routes.some((route) => route.path === normalized)) {
    return undefined;
  }

  const prefix = normalized === '/' ? '/' : `${normalized}/`;
  return routes.find((route) => route.path.startsWith(prefix))?.path;
}

export function getGroupRedirectPaths(routes: Route[]): string[] {
  const exactPaths = new Set(routes.map((route) => route.path));
  const candidates = new Set<string>();

  for (const route of routes) {
    for (const prefix of getRoutePrefixes(route.path)) {
      if (!exactPaths.has(prefix)) {
        candidates.add(prefix);
      }
    }
  }

  return [...candidates]
    .filter((candidate) => resolveGroupRedirect(candidate, routes) !== undefined)
    .sort();
}

// ─── Runtime helpers ──────────────────────────────────────────────────────────

/** Finds the route matching pathname exactly. */
export function matchRoute(routes: Route[], pathname: string): Route | undefined {
  const normalized = normalizePathname(pathname);
  return routes.find((r) => r.path === normalized);
}

export function getCurrentPath(): string {
  return stripBaseUrl(window.location.pathname || '/');
}
