import { describe, expect, it, vi } from 'vitest';
import { loadInitialRouteState, resolveAppPath } from '../../template/src/lib/bootstrap.js';
import type { Route } from '../../template/src/lib/types.js';

describe('resolveAppPath', () => {
  it('normalizes direct paths without redirects', () => {
    const routes: Route[] = [{ path: '/guide', importKey: '../docs/guide.mdx' }];

    expect(resolveAppPath('guide', routes)).toBe('/guide');
  });

  it('rewrites group paths to their first concrete child route', () => {
    const routes: Route[] = [{ path: '/guide/intro', importKey: '../docs/guide/intro.mdx' }];

    expect(resolveAppPath('/guide', routes)).toBe('/guide/intro');
  });
});

describe('loadInitialRouteState', () => {
  it('preloads the current route module when the route exists', async () => {
    const GuidePage = () => null;
    const routes: Route[] = [{ path: '/guide', importKey: '../docs/guide.mdx' }];
    const guideLoader = vi.fn().mockResolvedValue({ default: GuidePage });

    const result = await loadInitialRouteState('/guide', routes, {
      '../docs/guide.mdx': guideLoader,
    });

    expect(guideLoader).toHaveBeenCalledOnce();
    expect(result.currentPath).toBe('/guide');
    expect(result.currentRoute).toEqual(routes[0]);
    expect(result.initialImportKey).toBe('../docs/guide.mdx');
    expect(result.CurrentPage).toBe(GuidePage);
  });

  it('resolves group redirect paths before preloading the route', async () => {
    const IntroPage = () => null;
    const routes: Route[] = [{ path: '/guide/intro', importKey: '../docs/guide/intro.mdx' }];
    const introLoader = vi.fn().mockResolvedValue({ default: IntroPage });

    const result = await loadInitialRouteState('/guide', routes, {
      '../docs/guide/intro.mdx': introLoader,
    });

    expect(result.currentPath).toBe('/guide/intro');
    expect(result.currentRoute).toEqual(routes[0]);
    expect(introLoader).toHaveBeenCalledOnce();
  });

  it('returns without preloading when the route does not exist', async () => {
    const missingLoader = vi.fn();

    const result = await loadInitialRouteState('/missing', [], {
      '../docs/missing.mdx': missingLoader,
    });

    expect(result.currentPath).toBe('/missing');
    expect(result.currentRoute).toBeUndefined();
    expect(result.CurrentPage).toBeUndefined();
    expect(missingLoader).not.toHaveBeenCalled();
  });
});