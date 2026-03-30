/**
 * Generates a sitemap.xml from MDX source files and writes it to dist/.
 *
 * The sitemap follows the Sitemaps 0.9 protocol:
 *   https://www.sitemaps.org/protocol.html
 *
 * Each .mdx / .md file under docsDir becomes one <url> entry. The <lastmod>
 * date is taken from the file's mtime so it reflects the last real content
 * change without requiring a git history.
 *
 * If no siteUrl is configured the function logs a warning and skips writing,
 * because relative URLs are invalid per the spec.
 */

export { buildSitemap } from './build.js';
export { buildSitemapEntries, renderSitemap } from './helpers.js';
