import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mdxComponents } from '../components';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useTheme } from '../hooks/useTheme';
import { useTableOfContents } from '../hooks/useTableOfContents';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildBreadcrumbs, getAdjacentRoutes } from '../lib/navigation';
import { useSearch } from '../hooks/useSearch';
import type {
  NavigateFn,
  NavItem,
  PageMetaMap,
  PageModule,
  Route,
  ThemeAsset,
  ThemeMode,
} from '../lib/types';
import { Sidebar } from './sidebar/Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { Footer } from './Footer';
import { Header } from './Header';
import { NotFoundPage } from './NotFoundPage';
import { PageHeader } from './PageHeader';
import { PageLoading } from './PageLoading';
import { PageNavigation } from './PageNavigation';
import { SearchModal } from './SearchModal';
import { TableOfContents } from './TableOfContents';

interface LayoutProps {
  title: string;
  description: string;
  logo?: string | ThemeAsset;
  favicon?: string | ThemeAsset;
  nav: NavItem[];
  routes: Route[];
  currentPath: string;
  currentRoute: Route | undefined;
  isRoutePending?: boolean;
  pages: Record<string, () => Promise<unknown>>;
  rawPages?: Record<string, () => Promise<string>>;
  meta: PageMetaMap;
  github?: string;
  footer?: { description?: string };
  onNavigate: (path: string) => void;
  CurrentPage?: React.ComponentType<{ components?: Record<string, unknown> }>;
}

function resolveThemeAsset(
  asset: string | ThemeAsset | undefined,
  theme: ThemeMode,
): string | undefined {
  if (!asset) {
    return undefined;
  }

  if (typeof asset === 'string') {
    return asset;
  }

  return theme === 'dark' ? (asset.dark ?? asset.light) : (asset.light ?? asset.dark);
}

function useThemedFavicon(favicon: string | ThemeAsset | undefined, theme: ThemeMode) {
  const linkRef = useRef<HTMLLinkElement | null>(null);

  // Create a single <link> element on mount; remove SSR-generated ones
  useEffect(() => {
    document.head.querySelectorAll('link[data-litmdx-favicon="true"]').forEach((el) => el.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.setAttribute('data-litmdx-favicon', 'true');
    document.head.appendChild(link);
    linkRef.current = link;
    return () => {
      link.remove();
      linkRef.current = null;
    };
  }, []);

  // Update href whenever favicon config or theme changes
  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;
    const resolved = resolveThemeAsset(favicon, theme);
    link.href = resolved ?? '';
  }, [favicon, theme]);
}

interface LayoutMetaState {
  breadcrumbs: ReturnType<typeof buildBreadcrumbs>;
  currentFrontmatter: PageMetaMap[string] | undefined;
  hasResolvedRoute: boolean;
  isNotFound: boolean;
  isCurrentRouteMetaReady: boolean;
  showPageChrome: boolean;
}

function useLayoutMetaState({
  title,
  description,
  currentPath,
  currentRoute,
  meta,
  routes,
  isRoutePending,
}: Pick<
  LayoutProps,
  'title' | 'description' | 'currentPath' | 'currentRoute' | 'meta' | 'routes' | 'isRoutePending'
>): LayoutMetaState {
  const hasResolvedRoute = currentRoute !== undefined;
  const isNotFound = !isRoutePending && !hasResolvedRoute;
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentRoute, routes, meta),
    [currentRoute, meta, routes],
  );
  const isCurrentRouteMetaReady =
    currentRoute === undefined ||
    Object.prototype.hasOwnProperty.call(meta, currentRoute.importKey);
  const currentFrontmatter = currentRoute ? meta[currentRoute.importKey] : undefined;
  const showPageChrome = hasResolvedRoute && isCurrentRouteMetaReady;

  usePageMeta({
    siteTitle: title,
    pageTitle: isNotFound ? '404' : isCurrentRouteMetaReady ? currentFrontmatter?.title : undefined,
    description: isNotFound
      ? `The page ${currentPath} could not be found.`
      : isCurrentRouteMetaReady
        ? (currentFrontmatter?.description ?? description)
        : description,
    schema_type: isCurrentRouteMetaReady ? currentFrontmatter?.schema_type : undefined,
  });

  return {
    breadcrumbs,
    currentFrontmatter,
    hasResolvedRoute,
    isNotFound,
    isCurrentRouteMetaReady,
    showPageChrome,
  };
}

function useMobileSidebar(
  onNavigate: LayoutProps['onNavigate'],
  isDesktopSidebar: boolean,
  currentPath: string,
) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const preserveMobileNavOnNextRouteChange = useRef(false);

  useEffect(() => {
    if (preserveMobileNavOnNextRouteChange.current) {
      preserveMobileNavOnNextRouteChange.current = false;
      return;
    }

    setMobileNavOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (isDesktopSidebar) {
      setMobileNavOpen(false);
    }
  }, [isDesktopSidebar]);

  useEffect(() => {
    if (isDesktopSidebar || !mobileNavOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDesktopSidebar, mobileNavOpen]);

  const handleNavigate = useCallback<NavigateFn>(
    (path, options) => {
      const preserveSidebarOpen = Boolean(options?.preserveSidebarOpen && !isDesktopSidebar);
      preserveMobileNavOnNextRouteChange.current = preserveSidebarOpen;
      if (!preserveSidebarOpen) {
        setMobileNavOpen(false);
      }
      onNavigate(path);
    },
    [isDesktopSidebar, onNavigate],
  );

  return {
    isSidebarOpen: !isDesktopSidebar && mobileNavOpen,
    handleNavigate,
    handleToggleMobileNav: () => setMobileNavOpen((open) => !open),
    handleCloseOverlay: () => setMobileNavOpen(false),
  };
}

function renderPageContent({
  CurrentPage,
  Page,
  isRoutePending,
  currentPath,
  onNavigate,
}: {
  CurrentPage?: LayoutProps['CurrentPage'];
  Page: React.LazyExoticComponent<
    React.ComponentType<{ components?: Record<string, unknown> }>
  > | null;
  isRoutePending: boolean;
  currentPath: string;
  onNavigate: NavigateFn;
}) {
  if (CurrentPage) {
    return <CurrentPage components={mdxComponents} />;
  }

  if (Page) {
    return <Page components={mdxComponents} />;
  }

  if (isRoutePending) {
    return <PageLoading />;
  }

  return <NotFoundPage path={currentPath} onNavigate={onNavigate} />;
}

export function Layout({
  title,
  description,
  logo,
  nav,
  routes,
  currentPath,
  currentRoute,
  isRoutePending = false,
  pages,
  rawPages = {},
  meta,
  github,
  footer,
  favicon,
  onNavigate,
  CurrentPage,
}: LayoutProps) {
  const [articleEl, setArticleEl] = useState<HTMLElement | null>(null);
  const {
    open: searchOpen,
    setOpen: setSearchOpen,
    query: searchQuery,
    search: doSearch,
    results: searchResults,
    loading: searchLoading,
  } = useSearch();
  const isDesktopSidebar = useMediaQuery('(min-width: 1280px)');
  const articleRef = useCallback((el: HTMLElement | null) => setArticleEl(el), []);
  const { theme, toggleTheme } = useTheme();
  useThemedFavicon(favicon, theme);
  const { tocItems, activeHeadingId, setActiveHeadingId } = useTableOfContents(
    articleEl,
    currentPath,
  );

  const Page = useMemo(
    () =>
      currentRoute ? React.lazy(pages[currentRoute.importKey] as () => Promise<PageModule>) : null,
    [currentRoute?.importKey, pages],
  );
  const { breadcrumbs, hasResolvedRoute, showPageChrome } = useLayoutMetaState({
    title,
    description,
    currentPath,
    currentRoute,
    meta,
    routes,
    isRoutePending,
  });
  const { isSidebarOpen, handleNavigate, handleToggleMobileNav, handleCloseOverlay } =
    useMobileSidebar(onNavigate, isDesktopSidebar, currentPath);

  const { previous: previousRoute, next: nextRoute } = useMemo(
    () => getAdjacentRoutes(currentRoute, routes),
    [currentRoute, routes],
  );
  const handleOpenSearch = useCallback(() => setSearchOpen(true), [setSearchOpen]);
  const handleCloseSearch = useCallback(() => setSearchOpen(false), [setSearchOpen]);

  return (
    <div className="app-shell">
      <Header
        title={title}
        logo={logo}
        currentPath={currentPath}
        routes={routes}
        nav={nav}
        github={github}
        showSidebarToggle={!isDesktopSidebar}
        sidebarOpen={isSidebarOpen}
        onNavigate={handleNavigate}
        onToggleSidebar={handleToggleMobileNav}
        onOpenSearch={handleOpenSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <SearchModal
        open={searchOpen}
        query={searchQuery}
        results={searchResults}
        loading={searchLoading}
        onSearch={doSearch}
        onClose={handleCloseSearch}
        onNavigate={handleNavigate}
      />

      <div className="app-layout">
        {!isDesktopSidebar ? (
          <button
            type="button"
            aria-label="Close navigation overlay"
            className={`app-overlay ${isSidebarOpen ? 'is-visible' : ''}`}
            onClick={handleCloseOverlay}
          />
        ) : null}

        <div
          id="app-sidebar"
          className={`app-sidebar-frame ${isSidebarOpen ? 'is-open' : ''}`}
          aria-hidden={!isDesktopSidebar && !isSidebarOpen}
        >
          <Sidebar
            title={title}
            routes={routes}
            currentPath={currentPath}
            meta={meta}
            nav={nav}
            github={github}
            onNavigate={handleNavigate}
            onOpenSearch={handleOpenSearch}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>

        <main className="app-main">
          <div className="app-main-column">
            {hasResolvedRoute ? (
              <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigate} />
            ) : null}
            {showPageChrome ? (
              <PageHeader
                currentPath={currentPath}
                currentRoute={currentRoute}
                meta={meta}
                rawPages={rawPages}
              />
            ) : null}

            <Suspense fallback={<PageLoading />}>
              <article ref={articleRef} className="app-article prose">
                {renderPageContent({
                  CurrentPage,
                  Page,
                  isRoutePending,
                  currentPath,
                  onNavigate: handleNavigate,
                })}
              </article>
            </Suspense>

            {showPageChrome ? (
              <PageNavigation
                previousRoute={previousRoute}
                nextRoute={nextRoute}
                meta={meta}
                onNavigate={handleNavigate}
              />
            ) : null}
          </div>
        </main>

        {hasResolvedRoute ? (
          <TableOfContents
            items={tocItems}
            activeHeadingId={activeHeadingId}
            onActivate={setActiveHeadingId}
            variant="rail"
          />
        ) : null}
      </div>
      <Footer description={footer?.description} />
    </div>
  );
}
