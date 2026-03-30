// Prepares the .litmdx/ directory before Vite starts.
//
// Responsibilities:
//  1. Copy app.tsx and src/ from the CLI template into the generated directory.
//  2. Generate styles.css with an @import pointing to the absolute path of tailwindcss.
//     Bun does not hoist tailwindcss to the root node_modules/ — Tailwind v4's own
//     resolver would fail with a relative @import from inside .litmdx/.
//  3. Generate index.html injecting the title and description from the user's config.

import path from 'path';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { ResolvedConfig, ThemeAsset } from '@litmdx/core/config';
import { withBaseUrl } from '../utils/urls.js';
import { writeGeneratedPageMeta } from './page-meta.js';

export const templateDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../template',
);

// tailwindcss is a direct dependency of the CLI — createRequire finds it in
// packages/cli/node_modules/tailwindcss without relying on hoisting.
const _require = createRequire(import.meta.url);
export const tailwindcssPath = path.dirname(_require.resolve('tailwindcss/package.json'));

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

function copyDirSync(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function buildStylesCss(): string {
  const templateCss = readFileSync(path.join(templateDir, 'styles.css'), 'utf8');
  // Replace the relative `@import 'tailwindcss'` with an absolute path so
  // Tailwind v4 can resolve it regardless of where .litmdx/ lives.
  const withoutTailwindImport = templateCss.replace(/@import\s+["']tailwindcss["'];?\n?/, '');
  return `@import "${tailwindcssPath}";\n${withoutTailwindImport}`;
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

export function prepareEntryFiles(litmdxDir: string, docsDir?: string): void {
  mkdirSync(litmdxDir, { recursive: true });
  copyFileSync(path.join(templateDir, 'app.tsx'), path.join(litmdxDir, 'app.tsx'));
  copyDirSync(path.join(templateDir, 'src'), path.join(litmdxDir, 'src'));
  copyDirSync(path.join(templateDir, 'styles'), path.join(litmdxDir, 'styles'));
  writeFileSync(path.join(litmdxDir, 'styles.css'), buildStylesCss());
  writeGeneratedPageMeta(litmdxDir, docsDir ?? path.join(process.cwd(), 'docs'));
}

export function generateIndexHtml(litmdxDir: string, config: ResolvedConfig): string {
  const indexHtmlPath = path.join(litmdxDir, 'index.html');
  const head = config.head;
  const lang = head.lang ?? 'en';

  const extraMeta: string[] = [];
  extraMeta.push(...buildFaviconLinks(head.favicon, config.baseUrl));
  if (head.author) extraMeta.push(`<meta name="author" content="${head.author}" />`);
  if (head.themeColor) extraMeta.push(`<meta name="theme-color" content="${head.themeColor}" />`);
  if (head.keywords?.length) {
    extraMeta.push(`<meta name="keywords" content="${head.keywords.join(', ')}" />`);
  }
  const extraMetaStr = extraMeta.length > 0 ? `\n  ${extraMeta.join('\n  ')}` : '';

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
