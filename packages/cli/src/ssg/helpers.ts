import path from 'path';
import { escapeHtml } from '../utils/html.js';

export interface PrerenderHead {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl?: string;
  ogImage?: string;
  noindex?: boolean;
}

function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function upsertMeta(html: string, selector: string, tag: string): string {
  return html.includes(selector)
    ? html.replace(new RegExp(`<meta[^>]*${selector}[^>]*>`), tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

function upsertLink(html: string, selector: string, tag: string): string {
  return html.includes(selector)
    ? html.replace(new RegExp(`<link[^>]*${selector}[^>]*>`), tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

const THEME_INIT_SCRIPT = `<script data-litmdx-theme-init>(function(){try{var s=localStorage.getItem('litmdx-theme');var dark=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches);if(dark){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();</script>`;

export function injectStaticMarkup(template: string, appHtml: string, head: PrerenderHead): string {
  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  // Inject theme script as the first element in <head> so it runs before any CSS or paint.
  // The data-litmdx-theme-init attribute is the canonical guard against double-injection.
  if (!html.includes('data-litmdx-theme-init')) {
    html = html.replace('<head>', `<head>\n    ${THEME_INIT_SCRIPT}`);
  }

  html = replaceTag(html, /<title>.*?<\/title>/s, `<title>${escapeHtml(head.title)}</title>`);
  html = upsertMeta(
    html,
    'name="description"',
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
  );
  html = upsertMeta(
    html,
    'property="og:title"',
    `<meta property="og:title" content="${escapeHtml(head.ogTitle)}" />`,
  );
  html = upsertMeta(
    html,
    'property="og:description"',
    `<meta property="og:description" content="${escapeHtml(head.ogDescription)}" />`,
  );

  if (head.ogUrl) {
    html = upsertMeta(
      html,
      'property="og:url"',
      `<meta property="og:url" content="${escapeHtml(head.ogUrl)}" />`,
    );
    html = upsertLink(
      html,
      'rel="canonical"',
      `<link rel="canonical" href="${escapeHtml(head.ogUrl)}" />`,
    );
  }

  if (head.ogImage) {
    html = upsertMeta(
      html,
      'property="og:image"',
      `<meta property="og:image" content="${escapeHtml(head.ogImage)}" />`,
    );
  }

  if (head.noindex) {
    html = upsertMeta(html, 'name="robots"', `<meta name="robots" content="noindex" />`);
  }

  return html;
}

export function routeToOutputPath(outDir: string, route: string): string {
  return route === '/'
    ? path.join(outDir, 'index.html')
    : path.join(outDir, route.slice(1), 'index.html');
}
