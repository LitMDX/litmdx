import { describe, it, expect } from 'vitest';
import { filePathToRoute, buildRouteMap, resolveRoutes } from '../src/router.js';

describe('filePathToRoute', () => {
  it('maps docs/index.mdx to /', () => {
    expect(filePathToRoute('../docs/index.mdx')).toBe('/');
  });

  it('maps docs/guide.mdx to /guide', () => {
    expect(filePathToRoute('../docs/guide.mdx')).toBe('/guide');
  });

  it('maps docs/guide/index.mdx to /guide', () => {
    expect(filePathToRoute('../docs/guide/index.mdx')).toBe('/guide');
  });

  it('maps docs/guide/install.mdx to /guide/install', () => {
    expect(filePathToRoute('../docs/guide/install.mdx')).toBe('/guide/install');
  });

  it('handles absolute paths', () => {
    expect(filePathToRoute('/project/docs/api/reference.mdx')).toBe('/api/reference');
  });

  it('handles .md extension', () => {
    expect(filePathToRoute('../docs/intro.md')).toBe('/intro');
  });
});

describe('buildRouteMap', () => {
  it('converts glob entries to Route objects', () => {
    const glob = {
      '../docs/index.mdx': () => Promise.resolve({}),
      '../docs/guide.mdx': () => Promise.resolve({}),
    };
    const routes = buildRouteMap(glob);
    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({
      path: '/',
      importKey: '../docs/index.mdx',
    });
    expect(routes[1]).toMatchObject({
      path: '/guide',
      importKey: '../docs/guide.mdx',
    });
  });
});

describe('resolveRoutes', () => {
  it('places root route first', () => {
    const glob = {
      '../docs/zebra.mdx': () => Promise.resolve({}),
      '../docs/index.mdx': () => Promise.resolve({}),
      '../docs/alpha.mdx': () => Promise.resolve({}),
    };
    const routes = resolveRoutes(glob);
    expect(routes[0].path).toBe('/');
  });

  it('sorts non-root routes alphabetically', () => {
    const glob = {
      '../docs/zebra.mdx': () => Promise.resolve({}),
      '../docs/index.mdx': () => Promise.resolve({}),
      '../docs/alpha.mdx': () => Promise.resolve({}),
    };
    const routes = resolveRoutes(glob);
    expect(routes.map((r) => r.path)).toEqual(['/', '/alpha', '/zebra']);
  });

  it('handles a single index file', () => {
    const glob = { '../docs/index.mdx': () => Promise.resolve({}) };
    const routes = resolveRoutes(glob);
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/');
  });

  it('handles empty glob', () => {
    expect(resolveRoutes({})).toEqual([]);
  });
});
