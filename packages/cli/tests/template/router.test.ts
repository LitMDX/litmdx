import { describe, it, expect } from 'vitest';
import {
  getGroupRedirectPaths,
  normalizePathname,
  sortRoutesByMeta,
  resolveRoutes,
  matchRoute,
  resolveGroupRedirect,
  isMultiSectionMode,
  rewriteHomeRoutes,
} from '../../template/src/lib/router.js';
import type { Route, PageMetaMap } from '../../template/src/lib/types.js';

// Shared fixtures
const makeRoute = (path: string, importKey = path): Route => ({ path, importKey });

const routes: Route[] = [
  makeRoute('/', '../docs/index.mdx'),
  makeRoute('/guide', '../docs/guide.mdx'),
  makeRoute('/api', '../docs/api.mdx'),
  makeRoute('/intro', '../docs/intro.mdx'),
];

// ─── sortRoutesByMeta ─────────────────────────────────────────────────────────

describe('sortRoutesByMeta', () => {
  it('returns a new array (does not mutate the input)', () => {
    const meta: PageMetaMap = {};
    const result = sortRoutesByMeta(routes, meta);
    expect(result).not.toBe(routes);
  });

  it('respects sidebar_position ordering', () => {
    const meta: PageMetaMap = {
      '../docs/index.mdx': { sidebar_position: 3 },
      '../docs/guide.mdx': { sidebar_position: 1 },
      '../docs/api.mdx': { sidebar_position: 2 },
      '../docs/intro.mdx': { sidebar_position: 4 },
    };
    const result = sortRoutesByMeta(routes, meta);
    expect(result.map((r) => r.path)).toEqual(['/guide', '/api', '/', '/intro']);
  });

  it('places routes without sidebar_position after those with it', () => {
    const meta: PageMetaMap = {
      '../docs/guide.mdx': { sidebar_position: 1 },
    };
    const result = sortRoutesByMeta(routes, meta);
    expect(result[0].path).toBe('/guide');
    // rest are unsorted among themselves (Infinity tie → alphabetical with / first)
    const rest = result.slice(1).map((r) => r.path);
    expect(rest).toContain('/');
    expect(rest).toContain('/api');
    expect(rest).toContain('/intro');
  });

  it('falls back to "/" first, then alphabetical when all sidebar_positions are equal', () => {
    const meta: PageMetaMap = {}; // no positions
    const result = sortRoutesByMeta(routes, meta);
    expect(result[0].path).toBe('/');
    const nonRoot = result.slice(1).map((r) => r.path);
    expect(nonRoot).toEqual([...nonRoot].sort());
  });

  it('handles empty meta correctly', () => {
    const result = sortRoutesByMeta(routes, {});
    expect(result).toHaveLength(routes.length);
    expect(result[0].path).toBe('/');
  });

  it('handles empty routes array', () => {
    expect(sortRoutesByMeta([], {})).toEqual([]);
  });

  it('gives priority to lower sidebar_position numbers', () => {
    const twoRoutes = [makeRoute('/z', 'z'), makeRoute('/a', 'a')];
    const meta: PageMetaMap = { z: { sidebar_position: 1 }, a: { sidebar_position: 2 } };
    const result = sortRoutesByMeta(twoRoutes, meta);
    expect(result[0].path).toBe('/z');
  });
});

// ─── resolveRoutes (template version) ────────────────────────────────────────

describe('resolveRoutes (template)', () => {
  it('places root first', () => {
    const glob = {
      '../docs/zebra.mdx': () => Promise.resolve({}),
      '../docs/index.mdx': () => Promise.resolve({}),
    };
    const result = resolveRoutes(glob);
    expect(result[0].path).toBe('/');
  });

  it('maps nested paths correctly', () => {
    const glob = {
      '../docs/guide/install.mdx': () => Promise.resolve({}),
    };
    const result = resolveRoutes(glob);
    expect(result[0].path).toBe('/guide/install');
  });
});

// ─── isMultiSectionMode ───────────────────────────────────────────────────────

describe('isMultiSectionMode', () => {
  it('returns false when no routes have a section and none start with /home', () => {
    const flatRoutes: Route[] = [
      { path: '/', importKey: 'index.mdx' },
      { path: '/guide', importKey: 'guide.mdx' },
      { path: '/reference/api', importKey: 'reference/api.mdx' },
    ];
    expect(isMultiSectionMode(flatRoutes)).toBe(false);
  });

  it('returns true when a route path starts with /home/', () => {
    const routes: Route[] = [
      { path: '/home/overview', importKey: 'home/overview.mdx' },
      { path: '/community/participate', importKey: 'community/participate.mdx' },
    ];
    expect(isMultiSectionMode(routes)).toBe(true);
  });

  it('returns true when a route has a section field (post-rewrite)', () => {
    const routes: Route[] = [
      { path: '/', importKey: 'home/index.mdx', section: 'home' },
      { path: '/community/participate', importKey: 'community/participate.mdx', section: 'community' },
    ];
    expect(isMultiSectionMode(routes)).toBe(true);
  });

  it('returns true for exact /home path', () => {
    const routes: Route[] = [
      { path: '/home', importKey: 'home/index.mdx' },
    ];
    expect(isMultiSectionMode(routes)).toBe(true);
  });

  it('returns false for empty routes array', () => {
    expect(isMultiSectionMode([])).toBe(false);
  });
});

// ─── rewriteHomeRoutes ────────────────────────────────────────────────────────

describe('rewriteHomeRoutes', () => {
  const multiGlob = {
    '../docs/home/index.mdx': () => Promise.resolve({}),
    '../docs/home/vision.mdx': () => Promise.resolve({}),
    '../docs/community/participate.mdx': () => Promise.resolve({}),
    '../docs/reference/api.mdx': () => Promise.resolve({}),
    '../docs/reference/index.mdx': () => Promise.resolve({}),
    '../docs/index.mdx': () => Promise.resolve({}),          // loose root — excluded
    '../docs/getting-started.mdx': () => Promise.resolve({}), // loose root — excluded
  };

  const rawRoutes = resolveRoutes(multiGlob);

  it('returns the same array unchanged when not in multi-section mode', () => {
    const flatRoutes: Route[] = [
      { path: '/', importKey: 'index.mdx' },
      { path: '/guide', importKey: 'guide.mdx' },
    ];
    const result = rewriteHomeRoutes(flatRoutes);
    expect(result).toBe(flatRoutes);
  });

  it('rewrites /home/index to / with section "home"', () => {
    const result = rewriteHomeRoutes(rawRoutes);
    const root = result.find((r) => r.path === '/');
    expect(root).toBeDefined();
    expect(root?.section).toBe('home');
  });

  it('rewrites /home/<slug> to /<slug> with section "home"', () => {
    const result = rewriteHomeRoutes(rawRoutes);
    const vision = result.find((r) => r.path === '/vision');
    expect(vision).toBeDefined();
    expect(vision?.section).toBe('home');
  });

  it('keeps non-home section routes with their original path and assigns section', () => {
    const result = rewriteHomeRoutes(rawRoutes);
    const participate = result.find((r) => r.path === '/community/participate');
    expect(participate).toBeDefined();
    expect(participate?.section).toBe('community');
  });

  it('assigns section from first path segment for all multi-level routes', () => {
    const result = rewriteHomeRoutes(rawRoutes);
    const api = result.find((r) => r.path === '/reference/api');
    const refIndex = result.find((r) => r.path === '/reference');
    expect(api?.section).toBe('reference');
    expect(refIndex?.section).toBe('reference');
  });

  it('excludes loose root-level files (docs/index.mdx, docs/getting-started.mdx)', () => {
    const result = rewriteHomeRoutes(rawRoutes);
    // The only root path should be the rewritten home/index
    const rootRoutes = result.filter((r) => r.path === '/');
    expect(rootRoutes).toHaveLength(1);
    expect(rootRoutes[0].section).toBe('home');

    const gettingStarted = result.find((r) => r.importKey.includes('getting-started'));
    expect(gettingStarted).toBeUndefined();
  });

  it('returns a new array (does not mutate input)', () => {
    const copy = [...rawRoutes];
    rewriteHomeRoutes(rawRoutes);
    expect(rawRoutes).toEqual(copy);
  });

  it('result has no routes without a section in multi-section mode', () => {
    const result = rewriteHomeRoutes(rawRoutes);
    const withoutSection = result.filter((r) => r.section === undefined);
    expect(withoutSection).toHaveLength(0);
  });
});

// ─── resolveRoutes — extended ─────────────────────────────────────────────────

describe('resolveRoutes — path mapping', () => {
  it('strips docs/ prefix and .mdx extension', () => {
    const glob = { '../docs/guide.mdx': () => Promise.resolve({}) };
    const result = resolveRoutes(glob);
    expect(result[0].path).toBe('/guide');
  });

  it('resolves nested index files to the parent path', () => {
    const glob = { '../docs/guide/index.mdx': () => Promise.resolve({}) };
    const result = resolveRoutes(glob);
    expect(result[0].path).toBe('/guide');
  });

  it('resolves docs/index.mdx to root "/"', () => {
    const glob = { '../docs/index.mdx': () => Promise.resolve({}) };
    const result = resolveRoutes(glob);
    expect(result[0].path).toBe('/');
  });

  it('preserves the original importKey on each route', () => {
    const key = '../docs/api/reference.mdx';
    const glob = { [key]: () => Promise.resolve({}) };
    const result = resolveRoutes(glob);
    expect(result[0].importKey).toBe(key);
  });

  it('sorts alphabetically after root', () => {
    const glob = {
      '../docs/zebra.mdx': () => Promise.resolve({}),
      '../docs/apple.mdx': () => Promise.resolve({}),
      '../docs/index.mdx': () => Promise.resolve({}),
    };
    const result = resolveRoutes(glob);
    expect(result.map((r) => r.path)).toEqual(['/', '/apple', '/zebra']);
  });

  it('handles empty glob map', () => {
    expect(resolveRoutes({})).toEqual([]);
  });
});

describe('group redirects', () => {
  it('redirects a missing group route to the first sorted child route', () => {
    const meta: PageMetaMap = {
      '../docs/home/basics/getting-started.mdx': { sidebar_position: 1 },
      '../docs/home/basics/project-structure.mdx': { sidebar_position: 2 },
      '../docs/home/basics/routing.mdx': { sidebar_position: 3 },
    };
    const routes = sortRoutesByMeta(
      [
        makeRoute('/basics/routing', '../docs/home/basics/routing.mdx'),
        makeRoute('/basics/project-structure', '../docs/home/basics/project-structure.mdx'),
        makeRoute('/basics/getting-started', '../docs/home/basics/getting-started.mdx'),
      ],
      meta,
    );

    expect(resolveGroupRedirect('/basics', routes)).toBe('/basics/getting-started');
  });

  it('does not redirect when the route exists exactly', () => {
    const routes = [makeRoute('/basics'), makeRoute('/basics/getting-started')];
    expect(resolveGroupRedirect('/basics', routes)).toBeUndefined();
  });

  it('collects missing group paths that should be prerendered as redirects', () => {
    const meta: PageMetaMap = {
      '../docs/home/basics/getting-started.mdx': { sidebar_position: 1 },
      '../docs/home/basics/project-structure.mdx': { sidebar_position: 2 },
      '../docs/reference/api/auth.mdx': { sidebar_position: 1 },
    };
    const routes = sortRoutesByMeta(
      [
        makeRoute('/basics/project-structure', '../docs/home/basics/project-structure.mdx'),
        makeRoute('/reference/api/auth', '../docs/reference/api/auth.mdx'),
        makeRoute('/basics/getting-started', '../docs/home/basics/getting-started.mdx'),
      ],
      meta,
    );

    expect(getGroupRedirectPaths(routes)).toEqual(['/basics', '/reference', '/reference/api']);
  });
});

// ─── pathname normalization ──────────────────────────────────────────────────

describe('normalizePathname', () => {
  it('keeps root as /', () => {
    expect(normalizePathname('/')).toBe('/');
  });

  it('strips a trailing slash from non-root paths', () => {
    expect(normalizePathname('/guide/')).toBe('/guide');
  });

  it('strips multiple trailing slashes', () => {
    expect(normalizePathname('/guide///')).toBe('/guide');
  });
});

describe('matchRoute', () => {
  it('matches exact paths', () => {
    expect(matchRoute(routes, '/guide')?.path).toBe('/guide');
  });

  it('matches paths with a trailing slash', () => {
    expect(matchRoute(routes, '/guide/')?.path).toBe('/guide');
  });
});

// ─── matchRoute ───────────────────────────────────────────────────────────────

describe('matchRoute', () => {
  const testRoutes: Route[] = [
    makeRoute('/'),
    makeRoute('/guide'),
    makeRoute('/guide/install'),
    makeRoute('/reference/api'),
  ];

  it('returns the exact matching route', () => {
    const result = matchRoute(testRoutes, '/guide');
    expect(result?.path).toBe('/guide');
  });

  it('returns undefined when no exact match exists', () => {
    const result = matchRoute(testRoutes, '/does-not-exist');
    expect(result).toBeUndefined();
  });

  it('returns undefined when there is no match and no root route', () => {
    const noRoot: Route[] = [makeRoute('/guide'), makeRoute('/reference/api')];
    const result = matchRoute(noRoot, '/missing');
    expect(result).toBeUndefined();
  });

  it('prefers exact match when a matching route exists', () => {
    const result = matchRoute(testRoutes, '/reference/api');
    expect(result?.path).toBe('/reference/api');
  });

  it('matches nested paths exactly (no prefix matching)', () => {
    const result = matchRoute(testRoutes, '/guide/install');
    expect(result?.path).toBe('/guide/install');
  });

  it('handles an empty routes array gracefully', () => {
    expect(matchRoute([], '/guide')).toBeUndefined();
  });
});
