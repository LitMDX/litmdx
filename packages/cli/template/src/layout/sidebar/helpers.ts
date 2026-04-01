import { labelFromSegment, routeLabel } from '../../lib/navigation';
import type { PageMetaMap, Route } from '../../lib/types';
import type { SidebarGroupItem, SidebarItem } from './types';

// ───────────────────────────────────────────────────────────────────────────

/**
 * Shared builder: walks a list of routes, uses `effectiveSegs` to determine
 * the "effective" path segments, then groups or flattens accordingly.
 *
 * Index routes (single effective segment that matches a group key) are placed
 * as the first item inside the group, not as standalone sidebar entries.
 */
function buildItemsFromSegments(
  routes: Route[],
  effectiveSegs: (route: Route) => string[],
  meta: PageMetaMap = {},
): SidebarItem[] {
  // Pass 1: find all keys that have at least one multi-segment child → these form groups.
  const groupKeys = new Set<string>();
  for (const route of routes) {
    const segs = effectiveSegs(route);
    if (segs.length >= 2) groupKeys.add(segs[0]);
  }

  // Pass 2: map group key → index route importKey (single-segment route matching the key).
  const indexBySegment = new Map<string, string>();
  for (const route of routes) {
    const segs = effectiveSegs(route);
    if (segs.length === 1 && groupKeys.has(segs[0])) {
      indexBySegment.set(segs[0], route.importKey);
    }
  }

  // Pass 3: when a group has no index route, fall back to the first ordered page
  // in that group so page metadata can still control the group's collapsed state.
  const firstBySegment = new Map<string, string>();
  for (const route of routes) {
    const segs = effectiveSegs(route);
    const key = segs[0];
    if (!key || !groupKeys.has(key) || firstBySegment.has(key)) {
      continue;
    }

    firstBySegment.set(key, route.importKey);
  }

  // Pass 4: for groups without an index route, compute the minimum sidebar_position
  // among their children. This becomes the group's position in the parent sidebar
  // without conflicting with the children's own intra-group ordering.
  const groupMinPositionByKey = new Map<string, number>();
  for (const route of routes) {
    const segs = effectiveSegs(route);
    if (segs.length >= 2 && !indexBySegment.has(segs[0])) {
      const key = segs[0];
      const pos = meta[route.importKey]?.sidebar_position ?? Infinity;
      const current = groupMinPositionByKey.get(key) ?? Infinity;
      if (pos < current) groupMinPositionByKey.set(key, pos);
    }
  }

  const items: SidebarItem[] = [];
  const childRoutesByKey = new Map<string, Route[]>();
  const groupItemByKey = new Map<string, SidebarGroupItem>();
  // Tracks the sidebar_position for each group (from its index.mdx) so we can
  // sort the final items array correctly.
  const groupPositionByItem = new Map<SidebarGroupItem, number>();

  function getOrCreateGroup(key: string): Route[] {
    if (!childRoutesByKey.has(key)) {
      const childRoutes: Route[] = [];
      childRoutesByKey.set(key, childRoutes);
      const collapseMetaImportKey = indexBySegment.get(key) ?? firstBySegment.get(key);
      const defaultCollapsed = collapseMetaImportKey
        ? (meta[collapseMetaImportKey]?.sidebar_collapsed ?? true)
        : true;
      const groupPosition = indexBySegment.has(key)
        ? (meta[indexBySegment.get(key)!]?.sidebar_position ?? Infinity)
        : (groupMinPositionByKey.get(key) ?? Infinity);
      const groupItem: SidebarGroupItem = {
        kind: 'group',
        label: labelFromSegment(key),
        items: [],
        defaultCollapsed,
      };
      groupPositionByItem.set(groupItem, groupPosition);
      groupItemByKey.set(key, groupItem);
      items.push(groupItem);
    }
    return childRoutesByKey.get(key)!;
  }

  for (const route of routes) {
    const segs = effectiveSegs(route);

    if (segs.length === 0) {
      // Root route (e.g. `/` in home section) — always standalone.
      items.push({ kind: 'route', route });
    } else if (segs.length === 1) {
      if (groupKeys.has(segs[0])) {
        // Index route for a group — insert as first item inside the group.
        const childRoutes = getOrCreateGroup(segs[0]);
        childRoutes.unshift(route);
      } else {
        // Standalone route with no children.
        items.push({ kind: 'route', route });
      }
    } else {
      // Multi-segment route — belongs to its group.
      getOrCreateGroup(segs[0]).push(route);
    }
  }

  // Recursively build nested items for each group.
  for (const [key, childRoutes] of childRoutesByKey) {
    const groupItem = groupItemByKey.get(key)!;
    groupItem.items = buildItemsFromSegments(childRoutes, (r) => effectiveSegs(r).slice(1), meta);
  }

  // Sort items so that sidebar_position from each item's (or group's) index.mdx
  // controls the order. Groups use the position stored from their index route.
  items.sort((a, b) => {
    const posA =
      a.kind === 'route'
        ? (meta[a.route.importKey]?.sidebar_position ?? Infinity)
        : (groupPositionByItem.get(a) ?? Infinity);
    const posB =
      b.kind === 'route'
        ? (meta[b.route.importKey]?.sidebar_position ?? Infinity)
        : (groupPositionByItem.get(b) ?? Infinity);
    if (posA !== posB) return posA - posB;
    const labelA = a.kind === 'route' ? a.route.path : a.label;
    const labelB = b.kind === 'route' ? b.route.path : b.label;
    return labelA.localeCompare(labelB);
  });

  return items;
}

// ---------------------------------------------------------------------------
// Flat mode (existing behaviour — no docs/home/ directory)
// ---------------------------------------------------------------------------

export function buildSidebarItems(routes: Route[], meta: PageMetaMap = {}): SidebarItem[] {
  return buildItemsFromSegments(routes, (r) => r.path.split('/').filter(Boolean), meta);
}

// ---------------------------------------------------------------------------
// Multi-section mode helpers (active when docs/home/ exists)
// ---------------------------------------------------------------------------

/**
 * Determines the active section for the current path by looking up
 * the matching route's section field (set by rewriteHomeRoutes).
 * Falls back to first path segment for non-home sections.
 */
export function getActiveSection(currentPath: string, routes: Route[]): string | null {
  // Direct route match is the most reliable source
  const match = routes.find((r) => r.path === currentPath);
  if (match?.section) return match.section;

  // For non-home sections the first segment IS the section key
  const first = currentPath.split('/').filter(Boolean)[0];
  if (first) {
    const sectionExists = routes.some((r) => r.section === first);
    if (sectionExists) return first;
  }

  return null;
}

/** Filters routes to those belonging to the given section (or unsectioned root). */
export function filterRoutesBySection(routes: Route[], section: string | null): Route[] {
  if (section === null) return routes.filter((r) => !r.section);
  return routes.filter((r) => r.section === section);
}

/**
 * Builds sidebar items for the active section.
 *
 * Home section paths are like /overview, /vision (1 seg) or /advanced/tips (2 segs).
 * Other sections paths are like /community/participate (2 segs) or
 * /community/governance/voting (3 segs).
 *
 * Rule: strip the section prefix for non-home, then group by the first
 * remaining segment when there are 2+ effective segments.
 */
export function buildSectionItems(
  routes: Route[],
  section: string,
  meta: PageMetaMap = {},
): SidebarItem[] {
  const isHome = section === 'home';
  return buildItemsFromSegments(
    routes,
    (r) => {
      const segs = r.path.split('/').filter(Boolean);
      return isHome ? segs : segs.slice(1);
    },
    meta,
  );
}

/**
 * Returns the best navigation target for the sidebar brand button.
 * Prefers the section's index route, falls back to the first sorted route.
 */
export function getSectionHomeTarget(routes: Route[], section: string): string {
  const sectionRoutes = routes.filter((r) => r.section === section);
  const indexRoute =
    section === 'home'
      ? sectionRoutes.find((r) => r.path === '/')
      : sectionRoutes.find((r) => r.path === `/${section}`);
  return indexRoute?.path ?? sectionRoutes[0]?.path ?? '/';
}

// ---------------------------------------------------------------------------
// Shared helpers (used in both modes)
// ---------------------------------------------------------------------------

export function getSidebarLabel(route: Route, meta: PageMetaMap): string {
  const fm = meta[route.importKey];
  return fm?.sidebar_label ?? fm?.title ?? routeLabel(route.path);
}
