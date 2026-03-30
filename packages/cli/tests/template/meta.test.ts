import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPageMeta } from '../../template/src/lib/meta.js';

describe('loadPageMeta', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a page meta map from frontmatter loaders', async () => {
    const meta = await loadPageMeta({
      '../docs/guide.mdx': async () => ({ title: 'Guide', sidebar_position: 1 }),
      '../docs/api.mdx': async () => undefined,
    });

    expect(meta).toEqual({
      '../docs/guide.mdx': { title: 'Guide', sidebar_position: 1 },
      '../docs/api.mdx': {},
    });
  });

  it('keeps successful entries when one loader fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const meta = await loadPageMeta({
      '../docs/guide.mdx': async () => ({ title: 'Guide' }),
      '../docs/broken.mdx': async () => {
        throw new Error('boom');
      },
    });

    expect(meta).toEqual({
      '../docs/guide.mdx': { title: 'Guide' },
      '../docs/broken.mdx': {},
    });
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});