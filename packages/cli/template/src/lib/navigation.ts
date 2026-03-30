import type { NavItem, PageMetaMap, Route } from './types';
import { isMultiSectionMode } from './router';

// ─── String utils ─────────────────────────────────────────────────────────────

/** Converts a single path segment to a human-readable label. */
export function labelFromSegment(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Converts a route path to a human-readable label. */
export function routeLabel(routePath: string): string {
  if (routePath === '/') return 'Overview';
  const segment = routePath.split('/').pop() ?? '';
  return labelFromSegment(segment);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  path: string;
  current?: boolean;
  /** When false, renders as plain text rather than a button (no route exists at this path). */
  navigable?: boolean;
}

// ─── Route helpers ────────────────────────────────────────────────────────────

export function isRouteActive(targetPath: string, currentPath: string): boolean {
  if (targetPath === '/') return currentPath === '/';
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export function isNavItemActive(item: NavItem, currentPath: string, routes: Route[]): boolean {
  if (!item.to) return false;

  const currentSection = routes.find((route) => route.path === currentPath)?.section;
  if (currentSection !== undefined) {
    const targetSection = routes.find((route) => route.path === item.to)?.section;
    if (targetSection !== undefined) {
      return currentSection === targetSection;
    }
  }

  return isRouteActive(item.to, currentPath);
}

export function getRouteTitle(route: Route, meta: PageMetaMap): string {
  const fm = meta[route.importKey];
  return fm?.sidebar_label ?? fm?.title ?? routeLabel(route.path);
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

function makeCrumb(
  path: string,
  routes: Route[],
  meta: PageMetaMap,
  isCurrent: boolean,
): BreadcrumbItem {
  const route = routes.find((r) => r.path === path);
  return {
    label: route ? getRouteTitle(route, meta) : routeLabel(path),
    path,
    current: isCurrent,
    navigable: route !== undefined || isCurrent,
  };
}

function sectionRootPath(routes: Route[], section: string): string {
  const sectionRoutes = routes.filter((r) => r.section === section);
  return (
    sectionRoutes.find((r) => r.path === `/${section}`)?.path ??
    sectionRoutes[0]?.path ??
    `/${section}`
  );
}

export function buildBreadcrumbs(
  currentRoute: Route | undefined,
  routes: Route[],
  meta: PageMetaMap,
): BreadcrumbItem[] {
  if (!currentRoute || currentRoute.path === '/') {
    return [{ label: 'Home', path: '/', current: true }];
  }

  const { section } = currentRoute;
  const isNonHomeSection = section !== undefined && section !== 'home';
  const segments = currentRoute.path.split('/').filter(Boolean);

  if (isNonHomeSection) {
    const rootPath = sectionRootPath(routes, section);
    const rootCrumb: BreadcrumbItem = { label: routeLabel(`/${section}`), path: rootPath };

    if (segments.length === 1 || rootPath === currentRoute.path) {
      return [{ ...rootCrumb, current: true }];
    }

    // Skip the first segment (section key) and build remaining crumbs.
    return [
      rootCrumb,
      ...segments.slice(1).map((_, i) => {
        const path = `/${segments.slice(0, i + 2).join('/')}`;
        return makeCrumb(path, routes, meta, i === segments.length - 2);
      }),
    ];
  }

  // Flat mode or home section: global Home first, then each path segment.
  return [
    { label: 'Home', path: '/' },
    ...segments.map((_, i) => {
      const path = `/${segments.slice(0, i + 1).join('/')}`;
      return makeCrumb(path, routes, meta, i === segments.length - 1);
    }),
  ];
}

// ─── Nav helpers ─────────────────────────────────────────────────────────────

export function buildAutoNavItems(routes: Route[], meta: PageMetaMap): NavItem[] {
  if (routes.length === 0) {
    return [];
  }

  if (routes.some((route) => route.section !== undefined)) {
    const sectionMap = new Map<string, Route[]>();

    for (const route of routes) {
      if (!route.section) continue;
      const sectionRoutes = sectionMap.get(route.section);
      if (sectionRoutes) {
        sectionRoutes.push(route);
      } else {
        sectionMap.set(route.section, [route]);
      }
    }

    return [...sectionMap.entries()].flatMap(([section, sectionRoutes]) => {
      const target =
        section === 'home'
          ? (sectionRoutes.find((route) => route.path === '/')?.path ?? sectionRoutes[0]?.path)
          : (sectionRoutes.find((route) => route.path === `/${section}`)?.path ??
            sectionRoutes[0]?.path);

      if (!target) return [];

      const sectionRoot = sectionRoutes.find((route) => route.path === `/${section}`);
      const label =
        section === 'home'
          ? 'Home'
          : sectionRoot
            ? getRouteTitle(sectionRoot, meta)
            : labelFromSegment(section);

      return [{ label, to: target }];
    });
  }

  const topLevelGroups = new Map<string, Route[]>();

  for (const route of routes) {
    if (route.path === '/') continue;

    const topLevel = route.path.split('/').filter(Boolean)[0];
    if (!topLevel) continue;

    const groupRoutes = topLevelGroups.get(topLevel);
    if (groupRoutes) {
      groupRoutes.push(route);
    } else {
      topLevelGroups.set(topLevel, [route]);
    }
  }

  const items: NavItem[] = [];
  const rootRoute = routes.find((route) => route.path === '/');
  if (rootRoute) {
    items.push({ label: 'Home', to: rootRoute.path });
  }

  for (const [topLevel, groupRoutes] of topLevelGroups.entries()) {
    const exactRoute = groupRoutes.find((route) => route.path === `/${topLevel}`);
    const target = exactRoute?.path ?? groupRoutes[0]?.path;
    if (!target) continue;

    items.push({
      label: exactRoute ? getRouteTitle(exactRoute, meta) : labelFromSegment(topLevel),
      to: target,
    });
  }

  return items;
}

export function resolveHeaderNavItems(
  configuredNav: NavItem[],
  routes: Route[],
  meta: PageMetaMap,
): NavItem[] {
  if (configuredNav.length > 0) {
    return configuredNav;
  }

  return isMultiSectionMode(routes) ? buildAutoNavItems(routes, meta) : [];
}

// ─── Adjacent routes ──────────────────────────────────────────────────────────

function getNavigationSectionRoutes(currentRoute: Route, routes: Route[]): Route[] {
  if (currentRoute.section === undefined) {
    return routes.filter((route) => route.section === undefined);
  }

  return routes.filter((route) => route.section === currentRoute.section);
}

function getNavigationSegments(route: Route): string[] {
  const segments = route.path.split('/').filter(Boolean);
  return route.section !== undefined && route.section !== 'home' ? segments.slice(1) : segments;
}

function getSidebarOrderedRoutes(routes: Route[]): Route[] {
  const groupKeys = new Set<string>();

  for (const route of routes) {
    const segments = getNavigationSegments(route);
    if (segments.length >= 2) {
      groupKeys.add(segments[0]);
    }
  }

  const orderedItems: Array<Route | Route[]> = [];
  const groupMap = new Map<string, Route[]>();

  function getOrCreateGroup(groupKey: string): Route[] {
    const existingGroup = groupMap.get(groupKey);
    if (existingGroup) {
      return existingGroup;
    }

    const nextGroup: Route[] = [];
    groupMap.set(groupKey, nextGroup);
    orderedItems.push(nextGroup);
    return nextGroup;
  }

  for (const route of routes) {
    const segments = getNavigationSegments(route);

    if (segments.length === 0) {
      orderedItems.push(route);
      continue;
    }

    if (segments.length === 1) {
      if (groupKeys.has(segments[0])) {
        getOrCreateGroup(segments[0]).unshift(route);
      } else {
        orderedItems.push(route);
      }

      continue;
    }

    getOrCreateGroup(segments[0]).push(route);
  }

  return orderedItems.flatMap((item) => (Array.isArray(item) ? item : [item]));
}

/** Returns the previous and next routes following the same order shown in the sidebar. */
export function getAdjacentRoutes(
  currentRoute: Route | undefined,
  routes: Route[],
): { previous: Route | undefined; next: Route | undefined } {
  if (!currentRoute) {
    return { previous: undefined, next: undefined };
  }

  const navigationRoutes = getSidebarOrderedRoutes(
    getNavigationSectionRoutes(currentRoute, routes),
  );
  const index = navigationRoutes.findIndex((route) => route.path === currentRoute.path);

  if (index === -1) {
    return { previous: undefined, next: undefined };
  }

  return {
    previous: index > 0 ? navigationRoutes[index - 1] : undefined,
    next: index < navigationRoutes.length - 1 ? navigationRoutes[index + 1] : undefined,
  };
}
