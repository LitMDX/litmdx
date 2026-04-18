import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildSitemap, buildSitemapEntries, renderSitemap } from '../../src/sitemap/index.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpRoot = join(tmpdir(), `litmdx-sitemap-test-${Date.now()}`);
const docsDir = join(tmpRoot, 'docs');
const outDir = join(tmpRoot, 'dist');

// Fixed mtime used for all fixture files so lastmod is deterministic.
const FIXED_DATE = new Date('2025-01-15T00:00:00.000Z');
const FIXED_LASTMOD = '2025-01-15';

function mkdoc(relPath: string, content = '# Hello'): void {
  const full = join(docsDir, relPath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf8');
  utimesSync(full, FIXED_DATE, FIXED_DATE);
}

beforeAll(() => {
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  mkdoc('index.mdx');
  mkdoc('guide.mdx');
  mkdoc('guide/install.mdx');
  mkdoc('guide/index.mdx');
  mkdoc('reference.md');
});

afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

// ─── buildSitemapEntries ──────────────────────────────────────────────────────

describe('buildSitemapEntries', () => {
  it('returns one entry per MDX/MD file', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com');
    expect(entries).toHaveLength(5);
  });

  it('maps index.mdx to the root URL', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com');
    expect(entries.some((e) => e.loc === 'https://example.com/')).toBe(true);
  });

  it('maps guide.mdx to /guide', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com');
    expect(entries.some((e) => e.loc === 'https://example.com/guide')).toBe(true);
  });

  it('maps guide/install.mdx to /guide/install', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com');
    expect(entries.some((e) => e.loc === 'https://example.com/guide/install')).toBe(true);
  });

  it('maps guide/index.mdx to /guide', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com');
    // Both guide.mdx and guide/index.mdx map to /guide — both should appear.
    const guideEntries = entries.filter((e) => e.loc === 'https://example.com/guide');
    expect(guideEntries.length).toBeGreaterThanOrEqual(1);
  });

  it('maps .md files correctly', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com');
    expect(entries.some((e) => e.loc === 'https://example.com/reference')).toBe(true);
  });

  it('sets lastmod as YYYY-MM-DD from file mtime', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com');
    expect(entries.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.lastmod))).toBe(true);
    expect(entries.every((e) => e.lastmod === FIXED_LASTMOD)).toBe(true);
  });

  it('strips trailing slash from siteUrl', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com/');
    expect(entries.some((e) => e.loc === 'https://example.com/')).toBe(true);
    // No double-slash for the root URL.
    expect(entries.every((e) => !e.loc.includes('//'))).toBe(false); // https:// is expected
    expect(entries.every((e) => !e.loc.replace('https://', '').includes('//'))).toBe(true);
  });

  it('prefixes every sitemap entry with baseUrl when configured', () => {
    const entries = buildSitemapEntries(docsDir, 'https://example.com', '/docs/');
    expect(entries.some((e) => e.loc === 'https://example.com/docs/')).toBe(true);
    expect(entries.some((e) => e.loc === 'https://example.com/docs/guide')).toBe(true);
  });
});

// ─── renderSitemap ────────────────────────────────────────────────────────────

describe('renderSitemap', () => {
  const entries = [
    { loc: 'https://example.com/', lastmod: '2025-01-15' },
    { loc: 'https://example.com/guide', lastmod: '2025-01-10' },
  ];

  it('starts with an XML declaration', () => {
    expect(renderSitemap(entries)).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('uses the sitemaps.org namespace', () => {
    expect(renderSitemap(entries)).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
  });

  it('wraps entries in <urlset>', () => {
    const xml = renderSitemap(entries);
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
  });

  it('includes a <url> block for each entry', () => {
    const xml = renderSitemap(entries);
    const count = (xml.match(/<url>/g) ?? []).length;
    expect(count).toBe(2);
  });

  it('includes <loc> for each entry', () => {
    const xml = renderSitemap(entries);
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/guide</loc>');
  });

  it('includes <lastmod> for each entry', () => {
    const xml = renderSitemap(entries);
    expect(xml).toContain('<lastmod>2025-01-15</lastmod>');
    expect(xml).toContain('<lastmod>2025-01-10</lastmod>');
  });

  it('produces valid XML with no unclosed tags', () => {
    const xml = renderSitemap(entries);
    // Exclude processing instructions (<?...?>) from the open-tag count.
    const opens = (xml.match(/<[^/?][^>]*>/g) ?? []).filter((t) => !t.endsWith('/>'));
    const closes = (xml.match(/<\/[^>]+>/g) ?? []).length;
    expect(opens.length).toBe(closes);
  });

  it('handles an empty entries array', () => {
    const xml = renderSitemap([]);
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
    expect(xml).not.toContain('<url>');
  });
});

// ─── buildSitemap (integration) ──────────────────────────────────────────────

describe('buildSitemap', () => {
  it('writes sitemap.xml to outDir', async () => {
    await buildSitemap(docsDir, outDir, 'https://example.com');
    const content = readFileSync(join(outDir, 'sitemap.xml'), 'utf8');
    expect(content).toContain('<?xml version="1.0"');
    expect(content).toContain('https://example.com/');
  });

  it('overwrites an existing sitemap.xml on re-run', async () => {
    writeFileSync(join(outDir, 'sitemap.xml'), 'old content', 'utf8');
    await buildSitemap(docsDir, outDir, 'https://example.com');
    const content = readFileSync(join(outDir, 'sitemap.xml'), 'utf8');
    expect(content).not.toBe('old content');
    expect(content).toContain('<?xml version="1.0"');
  });

  it('uses a trailing-slash siteUrl correctly', async () => {
    await buildSitemap(docsDir, outDir, 'https://example.com/');
    const content = readFileSync(join(outDir, 'sitemap.xml'), 'utf8');
    expect(content).toContain('https://example.com/');
    expect(content).not.toContain('https://example.com//');
  });

  it('writes baseUrl-prefixed loc entries when configured', async () => {
    await buildSitemap(docsDir, outDir, 'https://example.com', '/docs/');
    const content = readFileSync(join(outDir, 'sitemap.xml'), 'utf8');
    expect(content).toContain('<loc>https://example.com/docs/</loc>');
    expect(content).toContain('<loc>https://example.com/docs/guide</loc>');
  });
});
