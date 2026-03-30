import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/config.js';

describe('resolveConfig', () => {
  it('returns defaults when called with no arguments', () => {
    const config = resolveConfig();
    expect(config).toEqual({
      title: 'LitMDX Docs',
      description: '',
      logo: undefined,
      baseUrl: '/',
      siteUrl: undefined,
      nav: [],
      docsDir: 'docs',
      head: {},
      openGraph: {},
      footer: {},
      github: undefined,
      plugins: { remarkPlugins: [], rehypePlugins: [] },
      webmcp: false,
    });
  });

  it('merges user values over defaults', () => {
    const config = resolveConfig({ title: 'My Docs', baseUrl: '/docs' });
    expect(config.title).toBe('My Docs');
    expect(config.baseUrl).toBe('/docs');
    // untouched defaults
    expect(config.description).toBe('');
    expect(config.nav).toEqual([]);
    expect(config.docsDir).toBe('docs');
  });

  it('preserves nav items', () => {
    const nav = [
      { label: 'Home', to: '/' },
      { label: 'GitHub', href: 'https://github.com' },
    ];
    const config = resolveConfig({ nav });
    expect(config.nav).toEqual(nav);
  });

  it('accepts custom docsDir', () => {
    const config = resolveConfig({ docsDir: 'content' });
    expect(config.docsDir).toBe('content');
  });

  it('handles empty object', () => {
    const config = resolveConfig({});
    expect(config.title).toBe('LitMDX Docs');
  });

  it('preserves themed logo variants', () => {
    const logo = { light: '/logo-light.png', dark: '/logo-dark.png' };
    const config = resolveConfig({ logo });
    expect(config.logo).toEqual(logo);
  });

  it('preserves themed favicon variants', () => {
    const favicon = { light: '/favicon-light.png', dark: '/favicon-dark.png' };
    const config = resolveConfig({ head: { favicon } });
    expect(config.head.favicon).toEqual(favicon);
  });
});

// ─── OpenGraph ────────────────────────────────────────────────────────────────

describe('resolveConfig — openGraph', () => {
  it('defaults to an empty object when openGraph is omitted', () => {
    const config = resolveConfig();
    expect(config.openGraph).toEqual({});
  });

  it('preserves the image URL', () => {
    const config = resolveConfig({ openGraph: { image: 'https://example.com/og.png' } });
    expect(config.openGraph.image).toBe('https://example.com/og.png');
  });

  it('preserves twitterCard: summary_large_image', () => {
    const config = resolveConfig({ openGraph: { twitterCard: 'summary_large_image' } });
    expect(config.openGraph.twitterCard).toBe('summary_large_image');
  });

  it('preserves twitterCard: summary', () => {
    const config = resolveConfig({ openGraph: { twitterCard: 'summary' } });
    expect(config.openGraph.twitterCard).toBe('summary');
  });

  it('preserves both image and twitterCard together', () => {
    const og = { image: 'https://example.com/og.png', twitterCard: 'summary_large_image' as const };
    const config = resolveConfig({ openGraph: og });
    expect(config.openGraph).toEqual(og);
  });

  it('does not pollute other fields when openGraph is set', () => {
    const config = resolveConfig({ openGraph: { image: 'https://example.com/og.png' } });
    expect(config.title).toBe('LitMDX Docs');
    expect(config.baseUrl).toBe('/');
  });
});

// ─── Plugin system ────────────────────────────────────────────────────────────

describe('resolveConfig — plugins', () => {
  it('defaults remarkPlugins to an empty array', () => {
    const config = resolveConfig();
    expect(config.plugins.remarkPlugins).toEqual([]);
  });

  it('defaults rehypePlugins to an empty array', () => {
    const config = resolveConfig();
    expect(config.plugins.rehypePlugins).toEqual([]);
  });

  it('preserves user-provided remarkPlugins', () => {
    const myPlugin = () => {};
    const config = resolveConfig({ plugins: { remarkPlugins: [myPlugin] } });
    expect(config.plugins.remarkPlugins).toEqual([myPlugin]);
  });

  it('preserves user-provided rehypePlugins', () => {
    const myPlugin = () => {};
    const config = resolveConfig({ plugins: { rehypePlugins: [myPlugin] } });
    expect(config.plugins.rehypePlugins).toEqual([myPlugin]);
  });

  it('preserves multiple plugins of each type', () => {
    const r1 = () => {};
    const r2 = () => {};
    const h1 = () => {};
    const config = resolveConfig({ plugins: { remarkPlugins: [r1, r2], rehypePlugins: [h1] } });
    expect(config.plugins.remarkPlugins).toEqual([r1, r2]);
    expect(config.plugins.rehypePlugins).toEqual([h1]);
  });

  it('handles plugins: {} with no arrays — both default to empty', () => {
    const config = resolveConfig({ plugins: {} });
    expect(config.plugins.remarkPlugins).toEqual([]);
    expect(config.plugins.rehypePlugins).toEqual([]);
  });
});

