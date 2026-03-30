import { describe, expect, it } from 'vitest';
import {
  joinSiteUrl,
  normalizeBaseUrl,
  normalizePathname,
  stripBaseUrl,
  withBaseUrl,
} from '../../template/src/lib/urls.js';

describe('normalizeBaseUrl', () => {
  it('keeps the root base url as /', () => {
    expect(normalizeBaseUrl('/')).toBe('/');
  });

  it('normalizes missing leading and trailing slashes', () => {
    expect(normalizeBaseUrl('docs')).toBe('/docs/');
  });

  it('collapses repeated leading/trailing slashes', () => {
    expect(normalizeBaseUrl('///docs///')).toBe('/docs/');
  });
});

describe('withBaseUrl', () => {
  it('prefixes root-relative routes with the configured base', () => {
    expect(withBaseUrl('/guide', '/docs/')).toBe('/docs/guide');
  });

  it('maps the root route to the base url', () => {
    expect(withBaseUrl('/', '/docs/')).toBe('/docs/');
  });

  it('keeps hash links unchanged', () => {
    expect(withBaseUrl('#intro', '/docs/')).toBe('#intro');
  });

  it('keeps relative links unchanged', () => {
    expect(withBaseUrl('./intro', '/docs/')).toBe('./intro');
  });
});

describe('stripBaseUrl', () => {
  it('removes the configured base prefix from the pathname', () => {
    expect(stripBaseUrl('/docs/guide', '/docs/')).toBe('/guide');
  });

  it('maps the base path itself back to /', () => {
    expect(stripBaseUrl('/docs/', '/docs/')).toBe('/');
  });

  it('leaves unrelated paths untouched', () => {
    expect(stripBaseUrl('/guide', '/docs/')).toBe('/guide');
  });
});

describe('normalizePathname', () => {
  it('removes trailing slashes from non-root paths', () => {
    expect(normalizePathname('/guide/')).toBe('/guide');
  });
});

describe('joinSiteUrl', () => {
  it('combines siteUrl, baseUrl, and route into a canonical url', () => {
    expect(joinSiteUrl('https://example.com', '/guide', '/docs/')).toBe(
      'https://example.com/docs/guide',
    );
  });

  it('builds the base root url correctly', () => {
    expect(joinSiteUrl('https://example.com', '/', '/docs/')).toBe(
      'https://example.com/docs/',
    );
  });
});