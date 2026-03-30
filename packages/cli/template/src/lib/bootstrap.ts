import { matchRoute, normalizePathname, resolveGroupRedirect } from './router';
import type { PageModule, Route } from './types';

export interface InitialRouteState {
  currentPath: string;
  currentRoute: Route | undefined;
  initialImportKey?: string;
  CurrentPage?: PageModule['default'];
}

export function resolveAppPath(pathname: string, routes: Route[]): string {
  const normalizedPath = normalizePathname(pathname.startsWith('/') ? pathname : `/${pathname}`);
  return resolveGroupRedirect(normalizedPath, routes) ?? normalizedPath;
}

async function preloadRouteModule(
  currentRoute: Route,
  pages: Record<string, () => Promise<unknown>>,
): Promise<PageModule['default']> {
  const loadPage = pages[currentRoute.importKey];
  if (!loadPage) {
    throw new Error(`Missing page loader for ${currentRoute.importKey}.`);
  }

  const module = (await loadPage()) as PageModule;
  return module.default;
}

export async function loadInitialRouteState(
  currentPath: string,
  routes: Route[],
  pages: Record<string, () => Promise<unknown>>,
): Promise<InitialRouteState> {
  const resolvedPath = resolveAppPath(currentPath, routes);
  const currentRoute = matchRoute(routes, resolvedPath);

  if (!currentRoute) {
    return {
      currentPath: resolvedPath,
      currentRoute,
    };
  }

  return {
    currentPath: resolvedPath,
    currentRoute,
    initialImportKey: currentRoute.importKey,
    CurrentPage: await preloadRouteModule(currentRoute, pages),
  };
}
