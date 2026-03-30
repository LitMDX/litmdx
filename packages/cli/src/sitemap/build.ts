import { writeFileSync } from 'fs';
import path from 'path';
import { buildSitemapEntries, renderSitemap } from './helpers.js';

export async function buildSitemap(
  docsDir: string,
  outDir: string,
  siteUrl: string,
  baseUrl = '/',
): Promise<void> {
  const entries = buildSitemapEntries(docsDir, siteUrl, baseUrl);
  const xml = renderSitemap(entries);
  const dest = path.join(outDir, 'sitemap.xml');
  writeFileSync(dest, xml, 'utf8');
  console.log(`  ✓ sitemap.xml written (${entries.length} URLs)`);
}
