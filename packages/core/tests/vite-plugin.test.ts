import { describe, it, expect, vi } from 'vitest';

// Mock heavy native/build-time deps before importing createVitePlugin.
// This keeps tests fast and free of filesystem/network calls.
vi.mock('@tailwindcss/vite', () => ({
  default: () => [{ name: 'tailwindcss:css' }],
}));

// Capture the options passed to mdx() so we can assert on the plugin pipeline.
let capturedMdxOptions: Record<string, unknown> = {};
vi.mock('@mdx-js/rollup', () => ({
  default: (opts: Record<string, unknown>) => {
    capturedMdxOptions = opts;
    return { name: 'vite:mdx' };
  },
}));

// Use the real rehype-shiki so we can assert identity in the plugin pipeline.
const rehypeShiki = (await import('@shikijs/rehype')).default;
const { createVitePlugin } = await import('../src/vite-plugin.js');

// ─── createVitePlugin ─────────────────────────────────────────────────────────

describe('createVitePlugin', () => {
  it('returns an array', () => {
    expect(Array.isArray(createVitePlugin())).toBe(true);
  });

  it('includes at least two plugins (tailwindcss + MDX)', () => {
    expect(createVitePlugin().flat().length).toBeGreaterThanOrEqual(2);
  });

  it('includes the MDX plugin', () => {
    const names = createVitePlugin()
      .flat()
      .map((p: { name?: string }) => p?.name);
    expect(names).toContain('vite:mdx');
  });

  // ─── MDX remark pipeline ───────────────────────────────────────────────────

  describe('remark plugins', () => {
    it('passes exactly 3 remark plugins to mdx()', () => {
      createVitePlugin();
      expect((capturedMdxOptions.remarkPlugins as unknown[]).length).toBe(3);
    });
  });

  // ─── MDX rehype pipeline ──────────────────────────────────────────────────

  describe('rehype plugins', () => {
    it('passes exactly 3 rehype plugins to mdx() (slug, autolink, shiki)', () => {
      createVitePlugin();
      expect((capturedMdxOptions.rehypePlugins as unknown[]).length).toBe(3);
    });

    it('includes rehype-shiki as the last rehype plugin', () => {
      createVitePlugin();
      const plugins = capturedMdxOptions.rehypePlugins as unknown[];
      const last = plugins[plugins.length - 1];
      // rehype-shiki is passed as [plugin, options]
      expect(Array.isArray(last)).toBe(true);
      expect((last as unknown[])[0]).toBe(rehypeShiki);
    });

    it('configures shiki with github-light (light) and github-dark (dark)', () => {
      createVitePlugin();
      const plugins = capturedMdxOptions.rehypePlugins as unknown[];
      const [, shikiOptions] = plugins[plugins.length - 1] as [unknown, Record<string, unknown>];
      expect(shikiOptions).toEqual({
        themes: { light: 'github-light', dark: 'github-dark' },
      });
    });

    it('includes rehype-autolink-headings with behavior: wrap', () => {
      createVitePlugin();
      const plugins = capturedMdxOptions.rehypePlugins as unknown[];
      const autolinkEntry = plugins.find(
        (p) => Array.isArray(p) && (p as unknown[])[1] !== undefined,
      ) as [unknown, Record<string, unknown>] | undefined;
      expect(autolinkEntry).toBeDefined();
      expect(autolinkEntry![1]).toEqual({ behavior: 'wrap' });
    });
  });
});

// ─── User plugin injection ────────────────────────────────────────────────────

describe('createVitePlugin — user plugins', () => {
  it('appends a user remark plugin after the 3 built-ins', () => {
    const userPlugin = () => {};
    createVitePlugin({ remarkPlugins: [userPlugin], rehypePlugins: [] });
    const remark = capturedMdxOptions.remarkPlugins as unknown[];
    expect(remark.length).toBe(4);
    expect(remark[3]).toBe(userPlugin);
  });

  it('appends multiple user remark plugins in order', () => {
    const p1 = () => {};
    const p2 = () => {};
    createVitePlugin({ remarkPlugins: [p1, p2], rehypePlugins: [] });
    const remark = capturedMdxOptions.remarkPlugins as unknown[];
    expect(remark.length).toBe(5);
    expect(remark[3]).toBe(p1);
    expect(remark[4]).toBe(p2);
  });

  it('appends a user rehype plugin after the 3 built-ins', () => {
    const userPlugin = () => {};
    createVitePlugin({ remarkPlugins: [], rehypePlugins: [userPlugin] });
    const rehype = capturedMdxOptions.rehypePlugins as unknown[];
    expect(rehype.length).toBe(4);
    expect(rehype[3]).toBe(userPlugin);
  });

  it('appends multiple user rehype plugins in order', () => {
    const h1 = () => {};
    const h2 = () => {};
    createVitePlugin({ remarkPlugins: [], rehypePlugins: [h1, h2] });
    const rehype = capturedMdxOptions.rehypePlugins as unknown[];
    expect(rehype.length).toBe(5);
    expect(rehype[3]).toBe(h1);
    expect(rehype[4]).toBe(h2);
  });

  it('handles empty plugin arrays — counts stay at 3', () => {
    createVitePlugin({ remarkPlugins: [], rehypePlugins: [] });
    expect((capturedMdxOptions.remarkPlugins as unknown[]).length).toBe(3);
    expect((capturedMdxOptions.rehypePlugins as unknown[]).length).toBe(3);
  });

  it('does not mutate the user-provided arrays', () => {
    const userRemark = [() => {}];
    const userRehype = [() => {}];
    const originalRemarkLen = userRemark.length;
    const originalRehypeLen = userRehype.length;
    createVitePlugin({ remarkPlugins: userRemark, rehypePlugins: userRehype });
    expect(userRemark.length).toBe(originalRemarkLen);
    expect(userRehype.length).toBe(originalRehypeLen);
  });
});
