import { describe, it, expect } from 'vitest';
import {
  isRouteActive,
  isNavItemActive,
  getRouteTitle,
  buildBreadcrumbs,
  buildAutoNavItems,
  resolveHeaderNavItems,
  routeLabel,
  labelFromSegment,
  getAdjacentRoutes,
} from '../../template/src/lib/navigation.js';
import type { Route, PageMetaMap, NavItem } from '../../template/src/lib/types.js';

const r = (path: string, section?: string): Route => ({
  path,
  importKey: `${path}.mdx`,
  ...(section !== undefined ? { section } : {}),
});

// ─── labelFromSegment ──────────────────────────────────────────────────────────

describe('labelFromSegment', () => {
  it('capitalises a single word', () => {
    expect(labelFromSegment('guide')).toBe('Guide');
  });

  it('replaces hyphens with spaces and title-cases each word', () => {
    expect(labelFromSegment('getting-started')).toBe('Getting Started');
  });

  it('handles already-cased input (e.g. acronyms)', () => {
    expect(labelFromSegment('API')).toBe('API');
  });

  it('handles multiple hyphen-separated words', () => {
    expect(labelFromSegment('foo-bar-baz')).toBe('Foo Bar Baz');
  });
});
// ─── routeLabel ───────────────────────────────────────────────────────────────

describe('routeLabel', () => {
  it('returns "Overview" for the root path', () => {
    expect(routeLabel('/')).toBe('Overview');
  });

  it('capitalises a single-segment path', () => {
    expect(routeLabel('/guide')).toBe('Guide');
  });

  it('replaces hyphens with spaces and title-cases each word', () => {
    expect(routeLabel('/getting-started')).toBe('Getting Started');
  });

  it('uses the last path segment for nested paths', () => {
    expect(routeLabel('/guide/getting-started')).toBe('Getting Started');
  });

  it('handles multiple consecutive hyphens gracefully', () => {
    expect(routeLabel('/foo-bar-baz')).toBe('Foo Bar Baz');
  });

  it('handles a deep nested path using only the last segment', () => {
    expect(routeLabel('/a/b/c/deep-dive')).toBe('Deep Dive');
  });
});

// ─── isRouteActive ───────────────────────────────────────────────────────────────

describe('isRouteActive', () => {
  it('root is active only when currentPath is exactly "/"', () => {
    expect(isRouteActive('/', '/')).toBe(true);
    expect(isRouteActive('/', '/guide')).toBe(false);
  });

  it('matches exact paths', () => {
    expect(isRouteActive('/guide', '/guide')).toBe(true);
  });

  it('matches sub-paths (prefix + /)', () => {
    expect(isRouteActive('/guide', '/guide/install')).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isRouteActive('/guide', '/reference')).toBe(false);
  });

  it('does not false-positive on shared prefix without slash', () => {
    expect(isRouteActive('/guide', '/guidelines')).toBe(false);
  });
});

describe('isNavItemActive', () => {
  it('matches exact and nested routes in flat mode', () => {
    const routes = [r('/'), r('/guide'), r('/guide/install')];
    expect(isNavItemActive({ label: 'Guide', to: '/guide' }, '/guide/install', routes)).toBe(true);
  });

  it('matches by section when both current route and nav target belong to the same section', () => {
    const routes = [
      r('/', 'home'),
      r('/vision', 'home'),
      r('/community', 'community'),
      r('/community/how-to-participate', 'community'),
    ];

    expect(
      isNavItemActive(
        { label: 'Community', to: '/community' },
        '/community/how-to-participate',
        routes,
      ),
    ).toBe(true);
    expect(isNavItemActive({ label: 'Home', to: '/' }, '/community/how-to-participate', routes)).toBe(
      false,
    );
  });

  it('returns false for external nav items', () => {
    expect(isNavItemActive({ label: 'GitHub', href: 'https://github.com/example/repo' }, '/', [r('/')])).toBe(false);
  });
});

// ─── getRouteTitle ────────────────────────────────────────────────────────────

describe('getRouteTitle', () => {
  it('falls back to title when sidebar_label is absent', () => {
    const route = r('/guide');
    const meta: PageMetaMap = { '/guide.mdx': { title: 'Full Title' } };
    expect(getRouteTitle(route, meta)).toBe('Full Title');
  });

  it('prefers sidebar_label over title', () => {
    const route = r('/guide');
    const meta: PageMetaMap = { '/guide.mdx': { sidebar_label: 'Short', title: 'Full Title' } };
    expect(getRouteTitle(route, meta)).toBe('Short');
  });

  it('falls back to routeLabel when no meta exists', () => {
    expect(getRouteTitle(r('/getting-started'), {})).toBe('Getting Started');
  });

  it('returns "Overview" for root path with no meta', () => {
    expect(getRouteTitle(r('/'), {})).toBe('Overview');
  });
});

// ─── buildBreadcrumbs ─────────────────────────────────────────────────────────

describe('buildBreadcrumbs — flat mode / home section', () => {
  const routes: Route[] = [
    r('/'),
    r('/guide'),
    r('/guide/install'),
    r('/guide/advanced/tips'),
  ];

  it('returns a single current crumb for the root path', () => {
    const result = buildBreadcrumbs(r('/'), routes, {});
    expect(result).toEqual([{ label: 'Home', path: '/', current: true }]);
  });

  it('returns Home + current for a top-level route', () => {
    const result = buildBreadcrumbs(r('/guide'), routes, {});
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'Home', path: '/' });
    expect(result[0].current).toBeUndefined();
    expect(result[1]).toMatchObject({ label: 'Guide', path: '/guide', current: true });
  });

  it('returns Home + intermediate + current for a nested route', () => {
    const result = buildBreadcrumbs(r('/guide/install'), routes, {});
    expect(result).toHaveLength(3);
    expect(result[0].path).toBe('/');
    expect(result[1]).toMatchObject({ path: '/guide', current: false, navigable: true });
    expect(result[2]).toMatchObject({ path: '/guide/install', current: true });
  });

  it('marks intermediate without a route as navigable: false', () => {
    // /guide/advanced does not exist as a route
    const result = buildBreadcrumbs(r('/guide/advanced/tips'), routes, {});
    const advanced = result.find((c) => c.path === '/guide/advanced');
    expect(advanced?.navigable).toBe(false);
  });

  it('marks intermediate with a route as navigable: true', () => {
    const result = buildBreadcrumbs(r('/guide/install'), routes, {});
    const guide = result.find((c) => c.path === '/guide');
    expect(guide?.navigable).toBe(true);
  });

  it('uses meta title when available', () => {
    const meta: PageMetaMap = { '/guide.mdx': { title: 'The Guide' } };
    const result = buildBreadcrumbs(r('/guide/install'), routes, meta);
    expect(result[1].label).toBe('The Guide');
  });

  it('returns Home crumb for undefined currentRoute', () => {
    const result = buildBreadcrumbs(undefined, routes, {});
    expect(result).toEqual([{ label: 'Home', path: '/', current: true }]);
  });

  it('home section routes behave like flat mode (Home first)', () => {
    const homeRoutes: Route[] = [r('/', 'home'), r('/vision', 'home'), r('/mission', 'home')];
    const result = buildBreadcrumbs(r('/vision', 'home'), homeRoutes, {});
    expect(result[0]).toMatchObject({ label: 'Home', path: '/' });
    expect(result[1]).toMatchObject({ path: '/vision', current: true });
  });
});

describe('buildBreadcrumbs — non-home multi-section', () => {
  const routes: Route[] = [
    r('/community', 'community'),
    r('/community/participate', 'community'),
    r('/community/governance/voting', 'community'),
    r('/reference/api', 'reference'),
  ];

  it('returns single current crumb when at the section root', () => {
    const result = buildBreadcrumbs(r('/community', 'community'), routes, {});
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: 'Community', path: '/community', current: true });
  });

  it('returns section root + current for a second-level route', () => {
    const result = buildBreadcrumbs(r('/community/participate', 'community'), routes, {});
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'Community', path: '/community' });
    expect(result[0].current).toBeUndefined();
    expect(result[1]).toMatchObject({ path: '/community/participate', current: true });
  });

  it('returns section root + intermediate + current for a third-level route', () => {
    const result = buildBreadcrumbs(r('/community/governance/voting', 'community'), routes, {});
    expect(result).toHaveLength(3);
    expect(result[0].path).toBe('/community');
    expect(result[1].path).toBe('/community/governance');
    expect(result[2]).toMatchObject({ path: '/community/governance/voting', current: true });
  });

  it('shows section label as current when section has no index and current route is the fallback root', () => {
    // reference has no /reference index — /reference/api is both the fallback root AND current route.
    // Both crumbs would share the same path, so we return a single current crumb instead.
    const result = buildBreadcrumbs(r('/reference/api', 'reference'), routes, {});
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: 'Reference', path: '/reference/api', current: true });
  });

  it('does not start with "Home" for non-home sections', () => {
    const result = buildBreadcrumbs(r('/community/participate', 'community'), routes, {});
    expect(result[0].label).not.toBe('Home');
  });
});

// ─── splitNavItems ────────────────────────────────────────────────────────────

describe('buildAutoNavItems', () => {
  it('builds section-level nav items in multi-section mode', () => {
    const routes: Route[] = [
      r('/', 'home'),
      r('/vision', 'home'),
      r('/community/how-to-participate', 'community'),
      r('/guide/configuration', 'guide'),
      r('/reference', 'reference'),
    ];

    expect(buildAutoNavItems(routes, {})).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Community', to: '/community/how-to-participate' },
      { label: 'Guide', to: '/guide/configuration' },
      { label: 'Reference', to: '/reference' },
    ]);
  });

  it('uses the section root title when a non-home section index exists', () => {
    const routes: Route[] = [r('/', 'home'), r('/reference', 'reference')];
    const meta: PageMetaMap = { '/reference.mdx': { title: 'API Reference' } };

    expect(buildAutoNavItems(routes, meta)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'API Reference', to: '/reference' },
    ]);
  });

  it('builds top-level nav items in flat mode', () => {
    const routes: Route[] = [r('/'), r('/guide'), r('/blog/post-one'), r('/reference/api')];
    const meta: PageMetaMap = { '/guide.mdx': { title: 'Guide' } };

    expect(buildAutoNavItems(routes, meta)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Guide', to: '/guide' },
      { label: 'Blog', to: '/blog/post-one' },
      { label: 'Reference', to: '/reference/api' },
    ]);
  });

  it('returns an empty array when there are no routes', () => {
    expect(buildAutoNavItems([], {})).toEqual([]);
  });
});

describe('resolveHeaderNavItems', () => {
  it('returns configured nav unchanged when provided', () => {
    const configured: NavItem[] = [{ label: 'Docs', to: '/guide' }];
    expect(resolveHeaderNavItems(configured, [r('/guide')], {})).toEqual(configured);
  });

  it('returns automatic nav in multi-section mode when config nav is empty', () => {
    const routes: Route[] = [r('/', 'home'), r('/guide/intro', 'guide')];
    expect(resolveHeaderNavItems([], routes, {})).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Guide', to: '/guide/intro' },
    ]);
  });

  it('returns an empty nav in flat mode when config nav is empty', () => {
    const routes: Route[] = [r('/'), r('/guide'), r('/reference/api')];
    expect(resolveHeaderNavItems([], routes, {})).toEqual([]);
  });
});

describe('getAdjacentRoutes', () => {
  it('returns previous and next following the sidebar order inside the active home group', () => {
    const routes: Route[] = [
      r('/', 'home'),
      r('/basics', 'home'),
      r('/features/configuration', 'home'),
      r('/basics/project-structure', 'home'),
      r('/features/frontmatter', 'home'),
      r('/basics/routing', 'home'),
      r('/features/components', 'home'),
    ];

    expect(getAdjacentRoutes(r('/basics/project-structure', 'home'), routes)).toEqual({
      previous: routes[1],
      next: routes[5],
    });
  });

  it('does not jump to a different section when only the current section is shown in the sidebar', () => {
    const routes: Route[] = [
      r('/', 'home'),
      r('/guide/intro', 'guide'),
      r('/guide/setup', 'guide'),
      r('/community/how-to-participate', 'community'),
    ];

    expect(getAdjacentRoutes(r('/guide/setup', 'guide'), routes)).toEqual({
      previous: routes[1],
      next: undefined,
    });
  });

  it('returns previous and next following the flattened sidebar order in flat mode', () => {
    const routes: Route[] = [
      r('/'),
      r('/guide'),
      r('/guide/install'),
      r('/guide/deployment'),
      r('/reference/api'),
    ];

    expect(getAdjacentRoutes(r('/guide/install'), routes)).toEqual({
      previous: routes[1],
      next: routes[3],
    });
  });

  it('keeps grouped pages together before moving to the next group in flat mode', () => {
    const routes: Route[] = [
      r('/'),
      r('/basics'),
      r('/features/configuration'),
      r('/basics/project-structure'),
      r('/features/frontmatter'),
      r('/basics/routing'),
    ];

    expect(getAdjacentRoutes(r('/basics/project-structure'), routes)).toEqual({
      previous: routes[1],
      next: routes[5],
    });
  });

  it('returns no adjacent routes when currentRoute is undefined', () => {
    expect(getAdjacentRoutes(undefined, [r('/guide')])).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});

// ─── getAdjacentRoutes ────────────────────────────────────────────────────────

describe('getAdjacentRoutes', () => {
  const routes: Route[] = [r('/'), r('/guide'), r('/guide/install'), r('/reference')];

  it('returns undefined previous for the first route', () => {
    const { previous, next } = getAdjacentRoutes(r('/'), routes);
    expect(previous).toBeUndefined();
    expect(next?.path).toBe('/guide');
  });

  it('returns undefined next for the last route', () => {
    const { previous, next } = getAdjacentRoutes(r('/reference'), routes);
    expect(previous?.path).toBe('/guide/install');
    expect(next).toBeUndefined();
  });

  it('returns correct previous and next for a middle route', () => {
    const { previous, next } = getAdjacentRoutes(r('/guide'), routes);
    expect(previous?.path).toBe('/');
    expect(next?.path).toBe('/guide/install');
  });

  it('returns both for a route in the middle of three', () => {
    const { previous, next } = getAdjacentRoutes(r('/guide/install'), routes);
    expect(previous?.path).toBe('/guide');
    expect(next?.path).toBe('/reference');
  });

  it('returns undefined for both when currentRoute is undefined', () => {
    const { previous, next } = getAdjacentRoutes(undefined, routes);
    expect(previous).toBeUndefined();
    expect(next).toBeUndefined();
  });

  it('returns undefined for both when the current route is not in the routes list', () => {
    const { previous, next } = getAdjacentRoutes(r('/missing'), routes);
    expect(previous).toBeUndefined();
    expect(next).toBeUndefined();
  });

  it('handles a single-route array', () => {
    const { previous, next } = getAdjacentRoutes(r('/'), [r('/')]);
    expect(previous).toBeUndefined();
    expect(next).toBeUndefined();
  });

  it('handles empty routes array', () => {
    const { previous, next } = getAdjacentRoutes(r('/guide'), []);
    expect(previous).toBeUndefined();
    expect(next).toBeUndefined();
  });
});
