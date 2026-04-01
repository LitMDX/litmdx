import { describe, it, expect } from 'vitest';
import {
  buildSidebarItems,
  buildSectionItems,
  filterRoutesBySection,
  getActiveSection,
  getSectionHomeTarget,
  getSidebarLabel,
} from '../../../template/src/layout/sidebar/helpers.js';
import { labelFromSegment } from '../../../template/src/lib/navigation.js';
import type { Route, PageMetaMap } from '../../../template/src/lib/types.js';

const r = (path: string, section?: string): Route => ({
  path,
  importKey: `${path}.mdx`,
  ...(section !== undefined ? { section } : {}),
});

// ─── labelFromSegment ────────────────────────────────────────────────────────

describe('labelFromSegment', () => {
  it('capitalises a single word', () => {
    expect(labelFromSegment('guide')).toBe('Guide');
  });

  it('replaces hyphens with spaces and title-cases each word', () => {
    expect(labelFromSegment('getting-started')).toBe('Getting Started');
  });

  it('handles already-cased input', () => {
    expect(labelFromSegment('API')).toBe('API');
  });
});

// ─── getSidebarLabel ──────────────────────────────────────────────────────────

describe('getSidebarLabel', () => {
  it('prefers sidebar_label over title', () => {
    const route = r('/guide');
    const meta: PageMetaMap = { '/guide.mdx': { sidebar_label: 'Quick Guide', title: 'Full Guide' } };
    expect(getSidebarLabel(route, meta)).toBe('Quick Guide');
  });

  it('falls back to title when sidebar_label is absent', () => {
    const route = r('/guide');
    const meta: PageMetaMap = { '/guide.mdx': { title: 'Full Guide' } };
    expect(getSidebarLabel(route, meta)).toBe('Full Guide');
  });

  it('falls back to routeLabel when no meta exists', () => {
    const route = r('/getting-started');
    expect(getSidebarLabel(route, {})).toBe('Getting Started');
  });

  it('returns "Overview" for the root path with no meta', () => {
    const route = r('/');
    expect(getSidebarLabel(route, {})).toBe('Overview');
  });
});

// ─── buildSidebarItems (flat mode) ───────────────────────────────────────────

describe('buildSidebarItems', () => {
  const flatRoutes: Route[] = [
    r('/'),
    r('/guide'),
    r('/guide/install'),
    r('/guide/configuration'),
    r('/reference/api'),
  ];

  it('emits a route item for top-level paths', () => {
    const items = buildSidebarItems([r('/'), r('/guide')]);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.kind === 'route')).toBe(true);
  });

  it('groups routes with a common first segment, including the index route', () => {
    const items = buildSidebarItems(flatRoutes);
    const group = items.find((i) => i.kind === 'group' && i.label === 'Guide');
    expect(group).toBeDefined();
    // /guide (index), /guide/install, /guide/configuration
    expect(group?.kind === 'group' && group.items).toHaveLength(3);
  });

  it('creates separate groups for separate first segments', () => {
    const items = buildSidebarItems(flatRoutes);
    const groups = items.filter((i) => i.kind === 'group');
    expect(groups).toHaveLength(2); // guide + reference
  });

  it('returns an empty array for empty input', () => {
    expect(buildSidebarItems([])).toEqual([]);
  });

  it('does not nest a single-segment route inside a group', () => {
    const items = buildSidebarItems([r('/'), r('/about')]);
    expect(items.every((i) => i.kind === 'route')).toBe(true);
  });
});

// ─── filterRoutesBySection ────────────────────────────────────────────────────

describe('filterRoutesBySection', () => {
  const allRoutes: Route[] = [
    r('/', 'home'),
    r('/vision', 'home'),
    r('/community/participate', 'community'),
    r('/reference/api', 'reference'),
  ];

  it('returns only routes matching the given section', () => {
    const result = filterRoutesBySection(allRoutes, 'home');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.section === 'home')).toBe(true);
  });

  it('returns community routes correctly', () => {
    const result = filterRoutesBySection(allRoutes, 'community');
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/community/participate');
  });

  it('returns routes without a section when section is null', () => {
    const withUnsectioned = [...allRoutes, r('/orphan')];
    const result = filterRoutesBySection(withUnsectioned, null);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/orphan');
  });

  it('returns empty array when section has no matching routes', () => {
    expect(filterRoutesBySection(allRoutes, 'nonexistent')).toEqual([]);
  });
});

// ─── getActiveSection ─────────────────────────────────────────────────────────

describe('getActiveSection', () => {
  const routes: Route[] = [
    r('/', 'home'),
    r('/vision', 'home'),
    r('/community/participate', 'community'),
    r('/reference/api', 'reference'),
  ];

  it('returns section from direct route match', () => {
    expect(getActiveSection('/', routes)).toBe('home');
    expect(getActiveSection('/vision', routes)).toBe('home');
  });

  it('falls back to first path segment when no route match', () => {
    // /community/participate is matched directly, but also segment fallback works
    expect(getActiveSection('/community/participate', routes)).toBe('community');
  });

  it('returns section by first path segment when path has no exact route', () => {
    // /reference exists in routes as /reference/api with section 'reference'
    expect(getActiveSection('/reference/api', routes)).toBe('reference');
  });

  it('returns null when path has no match and no section', () => {
    expect(getActiveSection('/unknown/path', routes)).toBeNull();
  });

  it('returns null for empty routes', () => {
    expect(getActiveSection('/guide', [])).toBeNull();
  });
});

// ─── getSectionHomeTarget ─────────────────────────────────────────────────────

describe('getSectionHomeTarget', () => {
  const routes: Route[] = [
    r('/', 'home'),
    r('/vision', 'home'),
    r('/community', 'community'),
    r('/community/participate', 'community'),
    r('/reference/api', 'reference'),
  ];

  it('returns "/" for the home section (its index route)', () => {
    expect(getSectionHomeTarget(routes, 'home')).toBe('/');
  });

  it('returns the /<section> path for a non-home section with an index', () => {
    expect(getSectionHomeTarget(routes, 'community')).toBe('/community');
  });

  it('falls back to first route when no index exists in section', () => {
    // reference has no /reference index, only /reference/api
    expect(getSectionHomeTarget(routes, 'reference')).toBe('/reference/api');
  });

  it('returns "/" when section has no routes at all', () => {
    expect(getSectionHomeTarget(routes, 'nonexistent')).toBe('/');
  });
});

// ─── buildSectionItems ────────────────────────────────────────────────────────

describe('buildSectionItems', () => {
  describe('home section (paths are root-level after rewrite)', () => {
    const homeRoutes: Route[] = [
      r('/', 'home'),
      r('/vision', 'home'),
      r('/mission', 'home'),
      r('/advanced/tips', 'home'),
      r('/advanced/patterns', 'home'),
    ];

    it('emits route items for single-segment home paths', () => {
      const items = buildSectionItems(homeRoutes, 'home');
      const routeItems = items.filter((i) => i.kind === 'route');
      expect(routeItems).toHaveLength(3); // /, /vision, /mission
    });

    it('groups nested home paths under a sub-group', () => {
      const items = buildSectionItems(homeRoutes, 'home');
      const group = items.find((i) => i.kind === 'group' && i.label === 'Advanced');
      expect(group).toBeDefined();
      expect(group?.kind === 'group' && group.items).toHaveLength(2);
    });
  });

  describe('non-home section (paths include section prefix)', () => {
    const communityRoutes: Route[] = [
      r('/community/participate', 'community'),
      r('/community/governance/voting', 'community'),
      r('/community/governance/proposals', 'community'),
    ];

    it('emits a route item for a single-level path (strips section prefix)', () => {
      const items = buildSectionItems(communityRoutes, 'community');
      const routeItems = items.filter((i) => i.kind === 'route');
      expect(routeItems).toHaveLength(1); // /community/participate → effective: participate
    });

    it('groups paths with a common sub-segment after stripping section prefix', () => {
      const items = buildSectionItems(communityRoutes, 'community');
      const group = items.find((i) => i.kind === 'group' && i.label === 'Governance');
      expect(group).toBeDefined();
      expect(group?.kind === 'group' && group.items).toHaveLength(2);
    });
  });

  it('returns an empty array for empty input', () => {
    expect(buildSectionItems([], 'home')).toEqual([]);
  });
});

// ─── nested groups ────────────────────────────────────────────────────────────

describe('nested groups (3-level paths)', () => {
  const routes: Route[] = [
    r('/features'),
    r('/features/configuration'),
    r('/features/customization'),
    r('/features/customization/custom-components'),
    r('/features/customization/tailwindcss'),
  ];

  it('creates a top-level group for the first segment', () => {
    const items = buildSidebarItems(routes);
    const featuresGroup = items.find((i) => i.kind === 'group' && i.label === 'Features');
    expect(featuresGroup).toBeDefined();
  });

  it('nests a sub-group inside the parent group', () => {
    const items = buildSidebarItems(routes);
    const featuresGroup = items.find((i) => i.kind === 'group' && i.label === 'Features');
    expect(featuresGroup?.kind === 'group').toBe(true);
    if (featuresGroup?.kind !== 'group') return;
    const customizationGroup = featuresGroup.items.find(
      (i) => i.kind === 'group' && i.label === 'Customization',
    );
    expect(customizationGroup).toBeDefined();
  });

  it('places leaf routes as items inside the nested group', () => {
    const items = buildSidebarItems(routes);
    const featuresGroup = items.find((i) => i.kind === 'group' && i.label === 'Features');
    if (featuresGroup?.kind !== 'group') return;
    const customizationGroup = featuresGroup.items.find(
      (i) => i.kind === 'group' && i.label === 'Customization',
    );
    expect(customizationGroup?.kind === 'group' && customizationGroup.items).toHaveLength(3); // index + 2 leaves
  });

  it('keeps the customization index route as the first item inside the sub-group', () => {
    const items = buildSidebarItems(routes);
    const featuresGroup = items.find((i) => i.kind === 'group' && i.label === 'Features');
    if (featuresGroup?.kind !== 'group') return;
    const customizationGroup = featuresGroup.items.find(
      (i) => i.kind === 'group' && i.label === 'Customization',
    );
    if (customizationGroup?.kind !== 'group') return;
    expect(customizationGroup.items[0]).toMatchObject({
      kind: 'route',
      route: { path: '/features/customization' },
    });
  });
});

// ─── sidebar_position on index.mdx controls group order ───────────────────────

describe('sidebar_position of index.mdx controls group position', () => {
  const routes: Route[] = [
    r('/features'),
    r('/features/configuration'),
    r('/basics'),
    r('/basics/getting-started'),
    r('/reference'),
    r('/reference/cli'),
  ];

  it('orders groups by sidebar_position of their index route', () => {
    const meta: PageMetaMap = {
      '/reference.mdx': { sidebar_position: 1 },
      '/basics.mdx':    { sidebar_position: 2 },
      '/features.mdx':  { sidebar_position: 3 },
    };
    const items = buildSidebarItems(routes, meta);
    expect(items.map((i) => (i.kind === 'group' ? i.label : ''))).toEqual([
      'Reference',
      'Basics',
      'Features',
    ]);
  });

  it('places groups without sidebar_position after those with one (alphabetical fallback)', () => {
    const meta: PageMetaMap = {
      '/features.mdx': { sidebar_position: 1 },
    };
    const items = buildSidebarItems(routes, meta);
    const labels = items.map((i) => (i.kind === 'group' ? i.label : ''));
    expect(labels[0]).toBe('Features');
    // Basics and Reference have no position — appear after, sorted alphabetically
    expect(labels.slice(1)).toEqual(['Basics', 'Reference']);
  });

  it('uses minimum child sidebar_position as group position when no index.mdx exists', () => {
    // No index routes — all routes are children (2 segments)
    const noIndexRoutes: Route[] = [
      r('/beta/intro'),
      r('/alpha/overview'),
      r('/alpha/setup'),
    ];
    const meta: PageMetaMap = {
      '/beta/intro.mdx':     { sidebar_position: 1 },
      '/alpha/overview.mdx': { sidebar_position: 5 },
      '/alpha/setup.mdx':    { sidebar_position: 3 },
    };
    const items = buildSidebarItems(noIndexRoutes, meta);
    const labels = items.map((i) => (i.kind === 'group' ? i.label : ''));
    // beta min=1, alpha min=3 → beta first
    expect(labels).toEqual(['Beta', 'Alpha']);
  });

  it('positions a nested sub-group using its index.mdx sidebar_position', () => {
    const nestedRoutes: Route[] = [
      r('/features'),
      r('/features/configuration'),
      r('/features/customization'),
      r('/features/customization/custom-components'),
      r('/features/customization/tailwindcss'),
    ];
    const meta: PageMetaMap = {
      '/features.mdx':                            { sidebar_position: 1 },
      '/features/configuration.mdx':              { sidebar_position: 1 },
      '/features/customization.mdx':              { sidebar_position: 2 },
      '/features/customization/tailwindcss.mdx':  { sidebar_position: 1 },
      '/features/customization/custom-components.mdx': { sidebar_position: 2 },
    };
    const items = buildSidebarItems(nestedRoutes, meta);
    const featuresGroup = items.find((i) => i.kind === 'group' && i.label === 'Features');
    if (featuresGroup?.kind !== 'group') return;

    // configuration (position 1) should come before the Customization sub-group (position 2)
    expect(featuresGroup.items[0]).toMatchObject({ kind: 'route', route: { path: '/features' } });
    expect(featuresGroup.items[1]).toMatchObject({ kind: 'route', route: { path: '/features/configuration' } });
    expect(featuresGroup.items[2]).toMatchObject({ kind: 'group', label: 'Customization' });
  });
});

// ─── sidebar_collapsed via buildSidebarItems ──────────────────────────────────

describe('sidebar_collapsed via buildSidebarItems', () => {
  const routes: Route[] = [
    r('/guide'),
    r('/guide/install'),
    r('/guide/configuration'),
  ];

  it('defaults defaultCollapsed to true when no meta provided', () => {
    const items = buildSidebarItems(routes);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(true);
  });

  it('sets defaultCollapsed true when index route has sidebar_collapsed: true', () => {
    // /guide is the index route (1 segment) for the "guide" group
    const meta: PageMetaMap = { '/guide.mdx': { sidebar_collapsed: true } };
    const items = buildSidebarItems(routes, meta);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(true);
  });

  it('sets defaultCollapsed false when index route has sidebar_collapsed: false', () => {
    const meta: PageMetaMap = { '/guide.mdx': { sidebar_collapsed: false } };
    const items = buildSidebarItems(routes, meta);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(false);
  });

  it('sets defaultCollapsed true when index route has no sidebar_collapsed field', () => {
    const meta: PageMetaMap = { '/guide.mdx': { title: 'Guide' } };
    const items = buildSidebarItems(routes, meta);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(true);
  });

  it('falls back to the page in sidebar_position 1 when the group has no index route', () => {
    const routesWithoutIndex: Route[] = [
      r('/basics/getting-started'),
      r('/basics/project-structure'),
      r('/basics/routing'),
    ];
    const meta: PageMetaMap = {
      '/basics/getting-started.mdx': { sidebar_collapsed: false },
    };

    const items = buildSidebarItems(routesWithoutIndex, meta);
    const group = items.find((i) => i.kind === 'group' && i.label === 'Basics');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(false);
  });
});

describe('sidebar_collapsed via buildSectionItems', () => {
  const homeRoutes: Route[] = [
    r('/basics', 'home'),
    r('/basics', 'home'),
    r('/basics/routing', 'home'),
  ];

  it('sets defaultCollapsed true for a home section group with sidebar_collapsed: true', () => {
    const meta: PageMetaMap = { '/basics.mdx': { sidebar_collapsed: true } };
    const items = buildSectionItems(homeRoutes, 'home', meta);
    const group = items.find((i) => i.kind === 'group' && i.label === 'Basics');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(true);
  });

  it('defaults defaultCollapsed to true for a home section group with no meta', () => {
    const items = buildSectionItems(homeRoutes, 'home');
    const group = items.find((i) => i.kind === 'group' && i.label === 'Basics');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(true);
  });

  it('falls back to the page in sidebar_position 1 in home sections when no index route exists', () => {
    const routesWithoutIndex: Route[] = [
      r('/basics/getting-started', 'home'),
      r('/basics/project-structure', 'home'),
      r('/basics/routing', 'home'),
    ];
    const meta: PageMetaMap = {
      '/basics/getting-started.mdx': { sidebar_collapsed: false },
    };

    const items = buildSectionItems(routesWithoutIndex, 'home', meta);
    const group = items.find((i) => i.kind === 'group' && i.label === 'Basics');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(false);
  });
});
