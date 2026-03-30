import { statSync } from 'fs';
import { walkMdx, fileToRoute } from '../utils/fs.js';
import { withBaseUrl } from '../utils/urls.js';

function toW3CDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function escapeUrl(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface SitemapEntry {
  loc: string;
  lastmod: string;
}

export function buildSitemapEntries(
  docsDir: string,
  siteUrl: string,
  baseUrl = '/',
): SitemapEntry[] {
  const base = siteUrl.replace(/\/+$/, '');

  return walkMdx(docsDir).map((file) => ({
    loc: escapeUrl(base + withBaseUrl(fileToRoute(file, docsDir), baseUrl)),
    lastmod: toW3CDate(statSync(file).mtime),
  }));
}

export function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      ({ loc, lastmod }) =>
        `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
    )
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
}
