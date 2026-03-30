import { describe, expect, it } from 'vitest';
import { normalizeSearchResultUrl } from '../../template/src/hooks/useSearch.js';

describe('normalizeSearchResultUrl', () => {
  it('strips the baseUrl prefix from search result urls', () => {
    expect(normalizeSearchResultUrl('/docs/features/webmcp', '/docs/')).toBe('/features/webmcp');
  });

  it('rewrites legacy /home search result urls to the public route', () => {
    expect(normalizeSearchResultUrl('/home/features/webmcp')).toBe('/features/webmcp');
    expect(normalizeSearchResultUrl('/docs/home/features/webmcp', '/docs/')).toBe('/features/webmcp');
    expect(normalizeSearchResultUrl('/home')).toBe('/');
  });
});