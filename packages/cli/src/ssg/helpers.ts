import path from 'path';
import { escapeHtml } from '../utils/html.js';

export interface PrerenderHead {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl?: string;
}

function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function upsertMeta(html: string, selector: string, tag: string): string {
  return html.includes(selector)
    ? html.replace(new RegExp(`<meta[^>]*${selector}[^>]*>`), tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

export function injectStaticMarkup(template: string, appHtml: string, head: PrerenderHead): string {
  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

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
  }

  return html;
}

export function routeToOutputPath(outDir: string, route: string): string {
  return route === '/'
    ? path.join(outDir, 'index.html')
    : path.join(outDir, route.slice(1), 'index.html');
}
