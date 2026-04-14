import path from 'path';
import { writeFileSync } from 'fs';
import type { ResolvedConfig, ThemeAsset } from '@litmdx/core/config';
import { withBaseUrl } from '../../utils/urls.js';

function resolveThemeAsset(
  asset: string | ThemeAsset | undefined,
  theme: 'light' | 'dark',
): string | undefined {
  if (!asset) {
    return undefined;
  }

  if (typeof asset === 'string') {
    return asset;
  }

  return theme === 'dark' ? (asset.dark ?? asset.light) : (asset.light ?? asset.dark);
}

function buildFaviconLinks(favicon: string | ThemeAsset | undefined, baseUrl: string): string[] {
  if (!favicon) {
    return [];
  }

  if (typeof favicon === 'string') {
    return [
      `<link rel="icon" href="${withBaseUrl(favicon, baseUrl)}" data-litmdx-favicon="true" />`,
    ];
  }

  const links: string[] = [];
  const light = resolveThemeAsset(favicon, 'light');
  const dark = resolveThemeAsset(favicon, 'dark');

  if (light) {
    links.push(
      `<link rel="icon" href="${withBaseUrl(light, baseUrl)}" media="(prefers-color-scheme: light)" data-litmdx-favicon="true" />`,
    );
  }

  if (dark) {
    links.push(
      `<link rel="icon" href="${withBaseUrl(dark, baseUrl)}" media="(prefers-color-scheme: dark)" data-litmdx-favicon="true" />`,
    );
  }

  const fallback = light ?? dark;
  if (fallback) {
    links.push(
      `<link rel="icon" href="${withBaseUrl(fallback, baseUrl)}" data-litmdx-favicon="true" />`,
    );
  }

  return links;
}

function buildLogoPreloadLinks(logo: string | ThemeAsset | undefined, baseUrl: string): string[] {
  if (!logo) return [];
  if (typeof logo === 'string') {
    return [
      `<link rel="preload" as="image" href="${withBaseUrl(logo, baseUrl)}" fetchpriority="high" />`,
    ];
  }
  const links: string[] = [];
  if (logo.light) {
    links.push(
      `<link rel="preload" as="image" href="${withBaseUrl(logo.light, baseUrl)}" media="(prefers-color-scheme: light)" fetchpriority="high" />`,
    );
  }
  if (logo.dark) {
    links.push(
      `<link rel="preload" as="image" href="${withBaseUrl(logo.dark, baseUrl)}" media="(prefers-color-scheme: dark)" fetchpriority="high" />`,
    );
  }
  return links;
}

function buildOpenGraphMeta(config: ResolvedConfig): string {
  const og = config.openGraph;
  const tags: string[] = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${config.title}" />`,
    `<meta property="og:title" content="${config.title}" />`,
    `<meta property="og:description" content="${config.description}" />`,
    `<meta property="og:locale" content="${og.locale ?? 'en_US'}" />`,
  ];
  if (og.image) tags.push(`<meta property="og:image" content="${og.image}" />`);
  const twitterCard = og.twitterCard ?? 'summary';
  tags.push(`<meta name="twitter:card" content="${twitterCard}" />`);
  if (og.twitterSite) tags.push(`<meta name="twitter:site" content="${og.twitterSite}" />`);
  return tags.join('\n  ');
}

export function generateIndexHtml(litmdxDir: string, config: ResolvedConfig): string {
  const indexHtmlPath = path.join(litmdxDir, 'index.html');
  const head = config.head;
  const lang = head.lang ?? 'en';

  const extraMeta: string[] = [];
  extraMeta.push(...buildFaviconLinks(head.favicon, config.baseUrl));
  extraMeta.push(...buildLogoPreloadLinks(config.logo, config.baseUrl));
  if (head.author) extraMeta.push(`<meta name="author" content="${head.author}" />`);
  if (head.themeColor) extraMeta.push(`<meta name="theme-color" content="${head.themeColor}" />`);
  if (head.keywords?.length) {
    extraMeta.push(`<meta name="keywords" content="${head.keywords.join(', ')}" />`);
  }
  extraMeta.push(`<meta name="robots" content="index, follow" />`);
  if (config.siteUrl) {
    const canonicalBase = config.siteUrl.replace(/\/+$/, '');
    extraMeta.push(`<link rel="canonical" href="${canonicalBase}/" />`);
  }
  const extraMetaStr = extraMeta.length > 0 ? `\n  ${extraMeta.join('\n  ')}` : '';

  // Inline the minimum CSS needed so the page background is correct from byte 1,
  // before any JS or external CSS loads. Prevents:
  //   - White flash on dark-mode users (FOUC)
  //   - Visible background color change after CSS bundle arrives
  const criticalCss = [
    ':root{color-scheme:light;--bg-page:#ffffff}',
    'html.dark{color-scheme:dark;--bg-page:#111111}',
    'html,body,#root{min-height:100%}',
    'body{margin:0;background:var(--bg-page)}',
  ].join('');

  // Blocking inline script — runs synchronously in <head>, before first paint.
  // Reads the stored/preferred theme and applies html.dark so dark-mode users
  // never see a white flash. Must NOT be deferred or async.
  const themeScript = `(function(){try{var t=localStorage.getItem('litmdx-theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){var h=document.documentElement;h.classList.add('dark');h.style.colorScheme='dark';}}catch(e){}})();`;

  writeFileSync(
    indexHtmlPath,
    `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.title}</title>
  <meta name="description" content="${config.description}" />${extraMetaStr}
  ${buildOpenGraphMeta(config)}
  <style>${criticalCss}</style>
  <script>${themeScript}</script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/app.tsx"></script>
</body>
</html>
`,
  );
  return indexHtmlPath;
}
