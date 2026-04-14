import React from 'react';
import { renderToString } from 'react-dom/server';
import config from 'litmdx:config';
import { mdxComponents } from '../components';
import { Layout } from '../layout/Layout';
import { loadPageMeta } from '../lib/meta';
import { resolveHeaderNavItems } from '../lib/navigation';
import {
  getGroupRedirectPaths,
  matchRoute,
  resolveGroupRedirect,
  resolveRoutes,
  rewriteHomeRoutes,
  sortRoutesByMeta,
} from '../lib/router';
import type { PageMetaMap, PageModule } from '../lib/types';
import { joinSiteUrl, normalizePathname } from '../lib/urls';

const pages = import.meta.glob('../../../docs/**/*.mdx');
const frontmatterPages = import.meta.glob('../../../docs/**/*.mdx', {
  import: 'frontmatter',
}) as Record<string, () => Promise<PageMetaMap[string] | undefined>>;
const rawPages = import.meta.glob('../../../docs/**/*.mdx', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const baseRoutes = rewriteHomeRoutes(
  resolveRoutes(pages as Record<string, () => Promise<unknown>>),
);

let metaPromise: Promise<PageMetaMap> | undefined;

function loadMeta(): Promise<PageMetaMap> {
  if (!metaPromise) {
    metaPromise = loadPageMeta(frontmatterPages);
  }

  return metaPromise;
}

async function loadAppState() {
  const meta = await loadMeta();
  const routes = sortRoutesByMeta(baseRoutes, meta);
  const nav = resolveHeaderNavItems(config.nav, routes, meta);
  return { meta, routes, nav };
}

function routeDescription(pathname: string, meta: PageMetaMap, currentImportKey?: string): string {
  if (!currentImportKey) {
    return `The page ${pathname} could not be found.`;
  }

  return meta[currentImportKey]?.description ?? config.description;
}

function routeTitle(meta: PageMetaMap, currentImportKey?: string): string {
  if (!currentImportKey) {
    return `404 | ${config.title}`;
  }

  const pageTitle = meta[currentImportKey]?.title;
  return pageTitle ? `${pageTitle} | ${config.title}` : config.title;
}

function routeUrl(pathname: string): string | undefined {
  if (!config.siteUrl) return undefined;
  return joinSiteUrl(config.siteUrl, pathname, config.baseUrl);
}

export async function getStaticRoutes(): Promise<string[]> {
  const { routes } = await loadAppState();
  return [...new Set([...routes.map((route) => route.path), ...getGroupRedirectPaths(routes)])];
}

export async function renderStaticRoute(pathname: string): Promise<{
  html: string;
  head: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogUrl?: string;
    ogImage?: string;
    noindex?: boolean;
  };
}> {
  const currentPath = normalizePathname(pathname);
  const { meta, routes, nav } = await loadAppState();
  const resolvedPath = resolveGroupRedirect(currentPath, routes) ?? currentPath;
  const currentRoute = matchRoute(routes, resolvedPath);
  const currentImportKey = currentRoute?.importKey;
  const description = routeDescription(resolvedPath, meta, currentImportKey);
  const title = routeTitle(meta, currentImportKey);

  let CurrentPage: PageModule['default'] | undefined;
  if (currentRoute) {
    const mod = (await pages[currentRoute.importKey]!()) as PageModule;
    CurrentPage = mod.default;
  }

  const html = renderToString(
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
      onNavigate={() => {}}
      CurrentPage={
        CurrentPage ? (props) => <CurrentPage {...props} components={mdxComponents} /> : undefined
      }
    />,
  );

  return {
    html,
    head: {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: routeUrl(resolvedPath),
      ogImage: currentImportKey ? meta[currentImportKey]?.image : undefined,
      noindex: currentImportKey ? (meta[currentImportKey]?.noindex ?? false) : false,
    },
  };
}
