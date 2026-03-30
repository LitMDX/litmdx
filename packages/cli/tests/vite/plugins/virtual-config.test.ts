import { describe, it, expect } from 'vitest';
import { VIRTUAL_CONFIG_ID, virtualConfigPlugin } from '../../../src/vite/plugins/virtual-config.js';
import type { ResolvedConfig } from '@litmdx/core/config';

const RESOLVED_ID = '\0' + VIRTUAL_CONFIG_ID;

const mockConfig: ResolvedConfig = {
  title: 'My Docs',
  description: 'A description',
  baseUrl: '/docs',
  nav: [{ label: 'Home', to: '/' }],
  docsDir: 'docs',
  openGraph: {},
  plugins: { remarkPlugins: [], rehypePlugins: [] },
};

const mockRoot = '/tmp/test-litmdx';

// ─── VIRTUAL_CONFIG_ID ───────────────────────────────────────────────────────

describe('VIRTUAL_CONFIG_ID', () => {
  it('equals "virtual:litmdx-config"', () => {
    expect(VIRTUAL_CONFIG_ID).toBe('virtual:litmdx-config');
  });
});

// ─── virtualConfigPlugin ─────────────────────────────────────────────────────

describe('virtualConfigPlugin', () => {
  it('returns a plugin with the correct name', () => {
    const plugin = virtualConfigPlugin(mockConfig, mockRoot);
    expect(plugin.name).toBe('litmdx:virtual-config');
  });

  describe('resolveId', () => {
    it('returns the null-prefixed internal ID for the virtual module ID', () => {
      const plugin = virtualConfigPlugin(mockConfig, mockRoot);
      // Vitest calls handlers directly — cast to any to access them as functions.
      const resolveId = plugin.resolveId as (id: string) => string | undefined;
      expect(resolveId(VIRTUAL_CONFIG_ID)).toBe(RESOLVED_ID);
    });

    it('returns undefined for any other module ID', () => {
      const plugin = virtualConfigPlugin(mockConfig, mockRoot);
      const resolveId = plugin.resolveId as (id: string) => string | undefined;
      expect(resolveId('some-other-module')).toBeUndefined();
      expect(resolveId('litmdx:something-else')).toBeUndefined();
    });
  });

  describe('load', () => {
    it('returns an ES module exporting the config as JSON for the resolved ID', () => {
      const plugin = virtualConfigPlugin(mockConfig, mockRoot);
      const load = plugin.load as (id: string) => string | undefined;
      const result = load(RESOLVED_ID);
      expect(result).toBe(`export default ${JSON.stringify(mockConfig)};`);
    });

    it('the exported JSON contains all config fields', () => {
      const plugin = virtualConfigPlugin(mockConfig, mockRoot);
      const load = plugin.load as (id: string) => string | undefined;
      const result = load(RESOLVED_ID) as string;
      const json = result.replace('export default ', '').replace(';', '');
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe(mockConfig.title);
      expect(parsed.description).toBe(mockConfig.description);
      expect(parsed.baseUrl).toBe(mockConfig.baseUrl);
      expect(parsed.nav).toEqual(mockConfig.nav);
    });

    it('returns undefined for modules other than the resolved ID', () => {
      const plugin = virtualConfigPlugin(mockConfig, mockRoot);
      const load = plugin.load as (id: string) => string | undefined;
      expect(load('some-other-id')).toBeUndefined();
      expect(load(VIRTUAL_CONFIG_ID)).toBeUndefined(); // not the resolved version
    });
  });
});
