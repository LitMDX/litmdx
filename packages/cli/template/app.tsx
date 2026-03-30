import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import config from 'litmdx:config';
import { Layout } from './src/layout/Layout';
import { WebMCPIntegration } from './src/layout/WebMCPIntegration';
import { loadInitialRouteState, resolveAppPath } from './src/lib/bootstrap';
import { resolveHeaderNavItems } from './src/lib/navigation';
import { pageMeta as initialPageMeta } from './src/generated/page-meta';
import {
  getCurrentPath,
  matchRoute,
  resolveRoutes,
  resolveGroupRedirect,
  rewriteHomeRoutes,
  sortRoutesByMeta,
} from './src/lib/router';
import { normalizePathname, withBaseUrl } from './src/lib/urls';
import type { PageMetaMap, PageModule } from './src/lib/types';
import './styles.css';

const pages = import.meta.glob('../docs/**/*.mdx');
const rawPages = import.meta.glob('../docs/**/*.mdx', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;
const pageLoaders = pages as Record<string, () => Promise<unknown>>;
const meta = initialPageMeta as PageMetaMap;
const routes = sortRoutesByMeta(rewriteHomeRoutes(resolveRoutes(pageLoaders)), meta);
const nav = resolveHeaderNavItems(config.nav, routes, meta);

interface AppProps {
  initialPath?: string;
  initialImportKey?: string;
  CurrentPage?: PageModule['default'];
}

function App({ initialPath, initialImportKey, CurrentPage: InitialCurrentPage }: AppProps) {
  const [currentPath, setCurrentPath] = useState(() => initialPath ?? getCurrentPath());

  useEffect(() => {
    const onPop = () => {
      setCurrentPath(resolveAppPath(getCurrentPath(), routes));
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const resolvedPath = useMemo(() => resolveAppPath(currentPath, routes), [currentPath]);
  const currentRoute = useMemo(() => matchRoute(routes, resolvedPath), [resolvedPath, routes]);

  const navigate = useCallback((to: string) => {
    const nextPath = normalizePathname(to);
    const redirectPath = resolveAppPath(nextPath, routes);
    const method = redirectPath === nextPath ? 'pushState' : 'replaceState';
    window.history[method](null, '', withBaseUrl(redirectPath));
    setCurrentPath(redirectPath);
  }, []);

  useEffect(() => {
    const redirectPath = resolveGroupRedirect(currentPath, routes);
    if (!redirectPath || redirectPath === currentPath) {
      return;
    }

    window.history.replaceState(null, '', withBaseUrl(redirectPath));
    setCurrentPath(redirectPath);
  }, [currentPath]);

  const currentPage = useMemo(
    () => (currentRoute?.importKey === initialImportKey ? InitialCurrentPage : undefined),
    [InitialCurrentPage, currentRoute?.importKey, initialImportKey],
  );

  return (
    <>
      <Layout
        title={config.title}
        description={config.description}
        logo={config.logo}
        favicon={config.head?.favicon}
        nav={nav}
        routes={routes}
        currentPath={resolvedPath}
        currentRoute={currentRoute}
        pages={pages}
        rawPages={rawPages}
        meta={meta}
        github={config.github}
        footer={config.footer}
        onNavigate={navigate}
        CurrentPage={currentPage}
      />
      {config.webmcp && (
        <WebMCPIntegration
          routes={routes}
          meta={meta}
          currentPath={resolvedPath}
          onNavigate={navigate}
          rawPages={rawPages}
        />
      )}
    </>
  );
}

async function bootstrap() {
  const initialPath = getCurrentPath();
  const initialState = await loadInitialRouteState(initialPath, routes, pageLoaders);

  if (initialState.currentPath !== initialPath) {
    window.history.replaceState(null, '', withBaseUrl(initialState.currentPath));
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing #root element.');
  }

  createRoot(rootElement).render(
    <App
      initialPath={initialState.currentPath}
      initialImportKey={initialState.initialImportKey}
      CurrentPage={initialState.CurrentPage}
    />,
  );
}

void bootstrap().catch((error) => {
  console.error('Failed to preload the initial page module.', error);

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw error;
  }

  createRoot(rootElement).render(<App />);
});
