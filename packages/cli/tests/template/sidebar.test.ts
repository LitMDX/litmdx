import { describe, it, expect } from 'vitest';
import {
  buildSidebarItems,
  buildSectionItems,
  getSidebarLabel,
  hasActiveDescendant,
  getActiveSection,
  filterRoutesBySection,
} from '../../template/src/layout/sidebar/helpers.js';
import type { Route, PageMetaMap } from '../../template/src/lib/types.js';
import type { SidebarItem } from '../../template/src/layout/sidebar/types.js';

const r = (path: string, section?: string): Route => ({
  path,
  importKey: `${path}.mdx`,
  ...(section !== undefined ? { section } : {}),
});

// ─── getSidebarLabel ──────────────────────────────────────────────────────────

describe('getSidebarLabel', () => {
  it('returns sidebar_label when set', () => {
    const route = r('/guide');
    const meta: PageMetaMap = { '/guide.mdx': { sidebar_label: 'Custom Label' } };
    expect(getSidebarLabel(route, meta)).toBe('Custom Label');
  });

  it('falls back to title when sidebar_label is absent', () => {
    const route = r('/guide');
    const meta: PageMetaMap = { '/guide.mdx': { title: 'Guide Title' } };
    expect(getSidebarLabel(route, meta)).toBe('Guide Title');
  });

  it('falls back to path-derived label when no frontmatter', () => {
    const route = r('/getting-started');
    expect(getSidebarLabel(route, {})).toBe('Getting Started');
  });
});

// ─── hasActiveDescendant ──────────────────────────────────────────────────────

describe('hasActiveDescendant', () => {
  const items: SidebarItem[] = [
    { kind: 'route', route: r('/a') },
    {
      kind: 'group',
      label: 'Group',
      items: [
        { kind: 'route', route: r('/b/c') },
        { kind: 'route', route: r('/b/d') },
      ],
      defaultCollapsed: true,
    },
  ];

  it('returns true for a direct route match', () => {
    expect(hasActiveDescendant(items, '/a')).toBe(true);
  });

  it('returns true for a nested route match', () => {
    expect(hasActiveDescendant(items, '/b/c')).toBe(true);
  });

  it('returns false when no route matches', () => {
    expect(hasActiveDescendant(items, '/other')).toBe(false);
  });

  it('handles empty items array', () => {
    expect(hasActiveDescendant([], '/a')).toBe(false);
  });
});

// ─── buildSidebarItems — flat mode ────────────────────────────────────────────

describe('buildSidebarItems', () => {
  it('builds a flat list of route items', () => {
    const routes = [r('/'), r('/a'), r('/b')];
    const items = buildSidebarItems(routes);
    expect(items.every((i) => i.kind === 'route')).toBe(true);
    expect(items).toHaveLength(3);
  });

  it('groups routes that share a parent segment', () => {
    const routes = [r('/guide/intro'), r('/guide/setup')];
    const items = buildSidebarItems(routes);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('group');
    if (items[0].kind === 'group') {
      expect(items[0].items).toHaveLength(2);
    }
  });

  it('pins index route as first item inside a group', () => {
    const routes = [r('/guide/intro'), r('/guide'), r('/guide/setup')];
    const items = buildSidebarItems(routes);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind).toBe('group');
    if (group?.kind === 'group') {
      expect(group.items[0].kind).toBe('route');
      if (group.items[0].kind === 'route') {
        expect(group.items[0].route.path).toBe('/guide');
      }
    }
  });

  it('respects sidebar_position for ordering', () => {
    const routes = [r('/b'), r('/a'), r('/c')];
    const meta: PageMetaMap = {
      '/a.mdx': { sidebar_position: 2 },
      '/b.mdx': { sidebar_position: 1 },
      '/c.mdx': { sidebar_position: 3 },
    };
    const items = buildSidebarItems(routes, meta);
    const paths = items
      .filter((i) => i.kind === 'route')
      .map((i) => (i.kind === 'route' ? i.route.path : ''));
    expect(paths).toEqual(['/b', '/a', '/c']);
  });

  it('derives group defaultCollapsed from its index.mdx frontmatter', () => {
    const routes = [r('/guide'), r('/guide/intro')];
    const meta: PageMetaMap = {
      '/guide.mdx': { sidebar_collapsed: false },
    };
    const items = buildSidebarItems(routes, meta);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.defaultCollapsed).toBe(false);
  });

  // ─── sidebar_hidden ─────────────────────────────────────────────────────────

  it('excludes routes with sidebar_hidden: true', () => {
    const routes = [r('/a'), r('/b'), r('/c')];
    const meta: PageMetaMap = { '/b.mdx': { sidebar_hidden: true } };
    const items = buildSidebarItems(routes, meta);
    const paths = items
      .filter((i) => i.kind === 'route')
      .map((i) => (i.kind === 'route' ? i.route.path : ''));
    expect(paths).not.toContain('/b');
    expect(paths).toContain('/a');
    expect(paths).toContain('/c');
  });

  it('excludes hidden routes from inside groups', () => {
    const routes = [r('/guide/intro'), r('/guide/hidden'), r('/guide/setup')];
    const meta: PageMetaMap = { '/guide/hidden.mdx': { sidebar_hidden: true } };
    const items = buildSidebarItems(routes, meta);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind).toBe('group');
    if (group?.kind === 'group') {
      expect(group.items).toHaveLength(2);
      const paths = group.items.map((i) => (i.kind === 'route' ? i.route.path : ''));
      expect(paths).not.toContain('/guide/hidden');
    }
  });

  it('removes a group entirely when all its children are hidden', () => {
    const routes = [r('/guide/intro'), r('/guide/setup')];
    const meta: PageMetaMap = {
      '/guide/intro.mdx': { sidebar_hidden: true },
      '/guide/setup.mdx': { sidebar_hidden: true },
    };
    const items = buildSidebarItems(routes, meta);
    expect(items).toHaveLength(0);
  });

  // ─── group label from frontmatter ───────────────────────────────────────────

  it('uses sidebar_label from the group index.mdx as the group label', () => {
    const routes = [r('/guide'), r('/guide/intro')];
    const meta: PageMetaMap = {
      '/guide.mdx': { sidebar_label: 'The Guide' },
    };
    const items = buildSidebarItems(routes, meta);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.label).toBe('The Guide');
  });

  it('uses title from the group index.mdx when sidebar_label is absent', () => {
    const routes = [r('/guide'), r('/guide/intro')];
    const meta: PageMetaMap = {
      '/guide.mdx': { title: 'Guide Title' },
    };
    const items = buildSidebarItems(routes, meta);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.label).toBe('Guide Title');
  });

  it('falls back to segment-derived label when index.mdx has no label or title', () => {
    const routes = [r('/getting-started'), r('/getting-started/intro')];
    const items = buildSidebarItems(routes);
    const group = items.find((i) => i.kind === 'group');
    expect(group?.kind === 'group' && group.label).toBe('Getting Started');
  });
});

// ─── buildSectionItems — multi-section mode ───────────────────────────────────

describe('buildSectionItems', () => {
  const routes = [
    r('/basics/intro', 'basics'),
    r('/basics/setup', 'basics'),
    r('/basics', 'basics'),
  ];

  it('strips section prefix from effective segments', () => {
    const items = buildSectionItems(routes, 'basics');
    // After stripping 'basics' prefix, each route has at most 1 effective segment
    // → flat items, no nesting. /basics (0 segs) is pinned as the index root.
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.kind === 'route')).toBe(true);
    const first = items[0];
    expect(first.kind === 'route' && first.route.path).toBe('/basics');
  });

  it('treats home section segments without stripping prefix', () => {
    const homeRoutes = [r('/', 'home'), r('/overview', 'home'), r('/vision', 'home')];
    const items = buildSectionItems(homeRoutes, 'home');
    expect(items.length).toBeGreaterThan(0);
  });

  it('respects sidebar_hidden in section mode', () => {
    const meta: PageMetaMap = { '/basics/setup.mdx': { sidebar_hidden: true } };
    const items = buildSectionItems(routes, 'basics', meta);
    // /basics (index) + /basics/intro = 2 items; /basics/setup is hidden
    expect(items).toHaveLength(2);
    const paths = items.map((i) => (i.kind === 'route' ? i.route.path : ''));
    expect(paths).not.toContain('/basics/setup');
  });
});

// ─── getActiveSection ─────────────────────────────────────────────────────────

describe('getActiveSection', () => {
  const routes = [r('/basics/intro', 'basics'), r('/reference/api', 'reference'), r('/', 'home')];

  it('returns section from matching route', () => {
    expect(getActiveSection('/basics/intro', routes)).toBe('basics');
  });

  it('falls back to first path segment when no direct route match', () => {
    expect(getActiveSection('/reference/other', routes)).toBe('reference');
  });

  it('returns null when no section matches', () => {
    expect(getActiveSection('/unknown/path', routes)).toBeNull();
  });
});

// ─── filterRoutesBySection ────────────────────────────────────────────────────

describe('filterRoutesBySection', () => {
  const routes = [
    r('/a', 'home'),
    r('/b', 'reference'),
    r('/c', 'reference'),
  ];

  it('returns only routes belonging to the given section', () => {
    const result = filterRoutesBySection(routes, 'reference');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.section === 'reference')).toBe(true);
  });

  it('returns unsectioned routes when section is null', () => {
    const mixed = [...routes, r('/d')];
    const result = filterRoutesBySection(mixed, null);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/d');
  });
});
