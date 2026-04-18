import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  generateIndexHtml,
  prepareEntryFiles,
  tailwindcssPath,
  writeGeneratedBuiltInComponents,
  writeGeneratedUserComponents,
} from '../../../src/vite/prepare/index.js';
import type { ResolvedConfig } from '@litmdx/core/config';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpRoot = join(tmpdir(), `litmdx-prepare-test-${Date.now()}`);

beforeAll(() => mkdirSync(tmpRoot, { recursive: true }));
afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

function baseConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    title: 'Test Docs',
    description: 'A test site',
    logo: undefined,
    baseUrl: '/',
    nav: [],
    docsDir: 'docs',
    head: {},
    openGraph: {},
    footer: {},
    github: undefined,
    plugins: { remarkPlugins: [], rehypePlugins: [] },
    siteUrl: undefined,
    webmcp: false,
    components: { mermaid: false },
    ...overrides,
  };
}

function html(overrides?: Partial<ResolvedConfig>): string {
  const dir = join(tmpRoot, `run-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  const filePath = generateIndexHtml(dir, baseConfig(overrides));
  return readFileSync(filePath, 'utf8');
}

// ─── generateIndexHtml ───────────────────────────────────────────────────────

describe('generateIndexHtml', () => {
  it('returns the path to the written index.html', () => {
    const dir = join(tmpRoot, 'path-test');
    mkdirSync(dir, { recursive: true });
    const result = generateIndexHtml(dir, baseConfig());
    expect(result).toBe(join(dir, 'index.html'));
  });

  it('writes a valid HTML5 doctype', () => {
    expect(html()).toContain('<!doctype html>');
  });

  // ─── Title & description ──────────────────────────────────────────────────

  it('injects <title> from config.title', () => {
    expect(html({ title: 'My Site' })).toContain('<title>My Site</title>');
  });

  it('injects og:title from config.title', () => {
    expect(html({ title: 'My Site' })).toContain(
      '<meta property="og:title" content="My Site" />',
    );
  });

  it('injects og:site_name from config.title', () => {
    expect(html({ title: 'My Site' })).toContain(
      '<meta property="og:site_name" content="My Site" />',
    );
  });

  it('injects description meta tag', () => {
    expect(html({ description: 'Hello world' })).toContain(
      '<meta name="description" content="Hello world" />',
    );
  });

  it('injects og:description from config.description', () => {
    expect(html({ description: 'Hello world' })).toContain(
      '<meta property="og:description" content="Hello world" />',
    );
  });

  // ─── OpenGraph image ──────────────────────────────────────────────────────

  it('omits og:image when openGraph.image is not set', () => {
    expect(html({ openGraph: {} })).not.toContain('og:image');
  });

  it('includes og:image when openGraph.image is provided', () => {
    expect(
      html({ openGraph: { image: 'https://example.com/og.png' } }),
    ).toContain('<meta property="og:image" content="https://example.com/og.png" />');
  });

  // ─── Twitter card ─────────────────────────────────────────────────────────

  it('defaults twitter:card to "summary" when openGraph.twitterCard is not set', () => {
    expect(html({ openGraph: {} })).toContain(
      '<meta name="twitter:card" content="summary" />',
    );
  });

  it('uses openGraph.twitterCard value when provided', () => {
    expect(
      html({ openGraph: { twitterCard: 'summary_large_image' } }),
    ).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it('uses summary when twitterCard is explicitly set to summary', () => {
    expect(
      html({ openGraph: { twitterCard: 'summary' } }),
    ).toContain('<meta name="twitter:card" content="summary" />');
  });

  // ─── og:type ──────────────────────────────────────────────────────────────

  it('always includes og:type = website', () => {
    expect(html()).toContain('<meta property="og:type" content="website" />');
  });

  // ─── og:locale ────────────────────────────────────────────────────────────

  it('defaults og:locale to en_US when not set', () => {
    expect(html({ openGraph: {} })).toContain(
      '<meta property="og:locale" content="en_US" />',
    );
  });

  it('uses openGraph.locale when provided', () => {
    expect(html({ openGraph: { locale: 'es_ES' } })).toContain(
      '<meta property="og:locale" content="es_ES" />',
    );
  });

  // ─── twitter:site ─────────────────────────────────────────────────────────

  it('omits twitter:site when openGraph.twitterSite is not set', () => {
    expect(html({ openGraph: {} })).not.toContain('twitter:site');
  });

  it('includes twitter:site when openGraph.twitterSite is provided', () => {
    expect(html({ openGraph: { twitterSite: '@litmdx' } })).toContain(
      '<meta name="twitter:site" content="@litmdx" />',
    );
  });

  // ─── lang ─────────────────────────────────────────────────────────────────

  it('defaults html lang to "en" when head.lang is not set', () => {
    expect(html({ head: {} })).toContain('<html lang="en">');
  });

  it('uses head.lang when provided', () => {
    expect(html({ head: { lang: 'es' } })).toContain('<html lang="es">');
  });

  // ─── favicon ──────────────────────────────────────────────────────────────

  it('omits favicon link when head.favicon is not set', () => {
    expect(html({ head: {} })).not.toContain('rel="icon"');
  });

  it('includes favicon link when head.favicon is provided', () => {
    expect(html({ head: { favicon: '/favicon.svg' } })).toContain(
      '<link rel="icon" href="/favicon.svg" data-litmdx-favicon="true" />',
    );
  });

  it('prefixes favicon with baseUrl when favicon uses a root-relative path', () => {
    expect(html({ baseUrl: '/docs/', head: { favicon: '/favicon.svg' } })).toContain(
      '<link rel="icon" href="/docs/favicon.svg" data-litmdx-favicon="true" />',
    );
  });

  it('keeps absolute favicon URLs unchanged when baseUrl is set', () => {
    expect(
      html({ baseUrl: '/docs/', head: { favicon: 'https://example.com/favicon.svg' } }),
    ).toContain(
      '<link rel="icon" href="https://example.com/favicon.svg" data-litmdx-favicon="true" />',
    );
  });

  it('includes themed favicon links when light and dark variants are provided', () => {
    const output = html({
      head: { favicon: { light: '/favicon-light.svg', dark: '/favicon-dark.svg' } },
    });

    expect(output).toContain(
      '<link rel="icon" href="/favicon-light.svg" media="(prefers-color-scheme: light)" data-litmdx-favicon="true" />',
    );
    expect(output).toContain(
      '<link rel="icon" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)" data-litmdx-favicon="true" />',
    );
    expect(output).toContain(
      '<link rel="icon" href="/favicon-light.svg" data-litmdx-favicon="true" />',
    );
  });

  // ─── author ───────────────────────────────────────────────────────────────

  it('omits author meta when head.author is not set', () => {
    expect(html({ head: {} })).not.toContain('name="author"');
  });

  it('includes author meta when head.author is provided', () => {
    expect(html({ head: { author: 'LitMDX Team' } })).toContain(
      '<meta name="author" content="LitMDX Team" />',
    );
  });

  // ─── themeColor ───────────────────────────────────────────────────────────

  it('omits theme-color meta when head.themeColor is not set', () => {
    expect(html({ head: {} })).not.toContain('theme-color');
  });

  it('includes theme-color meta when head.themeColor is provided', () => {
    expect(html({ head: { themeColor: '#3b82f6' } })).toContain(
      '<meta name="theme-color" content="#3b82f6" />',
    );
  });

  // ─── keywords ─────────────────────────────────────────────────────────────

  it('omits keywords meta when head.keywords is not set', () => {
    expect(html({ head: {} })).not.toContain('name="keywords"');
  });

  it('includes keywords meta when head.keywords is provided', () => {
    expect(html({ head: { keywords: ['docs', 'react', 'mdx'] } })).toContain(
      '<meta name="keywords" content="docs, react, mdx" />',
    );
  });

  // ─── App shell ────────────────────────────────────────────────────────────

  it('includes the #root div', () => {
    expect(html()).toContain('<div id="root"></div>');
  });

  it('includes the app.tsx module script', () => {
    expect(html()).toContain('<script type="module" src="/app.tsx"></script>');
  });

  // ─── robots meta ──────────────────────────────────────────────────────────

  it('always includes robots meta with index, follow', () => {
    expect(html()).toContain('<meta name="robots" content="index, follow" />');
  });

  // ─── canonical ────────────────────────────────────────────────────────────

  it('omits canonical link when siteUrl is not set', () => {
    expect(html({ siteUrl: undefined })).not.toContain('rel="canonical"');
  });

  it('includes canonical link when siteUrl is provided', () => {
    expect(html({ siteUrl: 'https://example.com' })).toContain(
      '<link rel="canonical" href="https://example.com/" />',
    );
  });

  it('normalises a trailing slash in the canonical href', () => {
    expect(html({ siteUrl: 'https://example.com/' })).toContain(
      '<link rel="canonical" href="https://example.com/" />',
    );
  });

  // ─── logo preload ─────────────────────────────────────────────────────────

  it('omits logo preload when logo is not configured', () => {
    expect(html({ logo: undefined })).not.toContain('rel="preload"');
  });

  it('includes a preload link for a string logo', () => {
    expect(html({ logo: '/logo.svg' })).toContain(
      '<link rel="preload" as="image" href="/logo.svg" fetchpriority="high" />',
    );
  });

  it('prefixes the logo preload href with baseUrl', () => {
    expect(html({ logo: '/logo.svg', baseUrl: '/docs/' })).toContain(
      '<link rel="preload" as="image" href="/docs/logo.svg" fetchpriority="high" />',
    );
  });

  it('includes themed preload links when logo has light and dark variants', () => {
    const output = html({ logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } });
    expect(output).toContain(
      '<link rel="preload" as="image" href="/logo-light.svg" media="(prefers-color-scheme: light)" fetchpriority="high" />',
    );
    expect(output).toContain(
      '<link rel="preload" as="image" href="/logo-dark.svg" media="(prefers-color-scheme: dark)" fetchpriority="high" />',
    );
  });

  it('includes only the available variant when logo has only a light asset', () => {
    const output = html({ logo: { light: '/logo-light.svg' } });
    expect(output).toContain(
      '<link rel="preload" as="image" href="/logo-light.svg" media="(prefers-color-scheme: light)" fetchpriority="high" />',
    );
    expect(output).not.toContain('media="(prefers-color-scheme: dark)"');
  });
});

// ─── prepareEntryFiles ───────────────────────────────────────────────────────

describe('prepareEntryFiles', () => {
  function prep(): string {
    const dir = join(tmpRoot, `litmdx-${Math.random().toString(36).slice(2)}`);
    const docsDir = join(dir, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, 'index.mdx'),
      '---\ntitle: Home\ndescription: Landing\nsidebar_position: 1\nsidebar_collapsed: false\n---\n# Home\n',
      'utf8',
    );
    prepareEntryFiles(dir, docsDir);
    return dir;
  }

  it('creates the target directory if it does not exist', () => {
    const dir = prep();
    expect(existsSync(dir)).toBe(true);
  });

  it('copies app.tsx into the target directory', () => {
    const dir = prep();
    expect(existsSync(join(dir, 'app.tsx'))).toBe(true);
  });

  it('app.tsx is non-empty', () => {
    const dir = prep();
    expect(readFileSync(join(dir, 'app.tsx'), 'utf8').length).toBeGreaterThan(0);
  });

  it('copies the src/ directory', () => {
    const dir = prep();
    expect(existsSync(join(dir, 'src'))).toBe(true);
  });

  it('copies the styles/ directory', () => {
    const dir = prep();
    expect(existsSync(join(dir, 'styles'))).toBe(true);
  });

  it('writes styles.css with an absolute @import for tailwindcss', () => {
    const dir = prep();
    const css = readFileSync(join(dir, 'styles.css'), 'utf8');
    expect(css).toContain(`@import "${tailwindcssPath}"`);
  });

  it('styles.css does not keep the original relative @import for tailwindcss', () => {
    const dir = prep();
    const css = readFileSync(join(dir, 'styles.css'), 'utf8');
    expect(css).not.toMatch(/@import\s+["']tailwindcss["']/);
  });

  it('styles.css still contains the remaining @import chain', () => {
    const dir = prep();
    const css = readFileSync(join(dir, 'styles.css'), 'utf8');
    // The original styles.css imports shell.css among others.
    expect(css).toContain('shell.css');
  });

  it('writes a generated page metadata module', () => {
    const dir = prep();
    const generated = readFileSync(join(dir, 'src', 'generated', 'page-meta.ts'), 'utf8');
    expect(generated).toContain('../docs/index.mdx');
    expect(generated).toContain('"title": "Home"');
    expect(generated).toContain('"sidebar_collapsed": false');
  });

  it('writes a generated built-in-components module with empty map by default', () => {
    const dir = prep();
    const generated = readFileSync(
      join(dir, 'src', 'generated', 'built-in-components.ts'),
      'utf8',
    );
    expect(generated).toContain('export const builtInComponents = {} as const;');
    expect(generated).not.toContain('Mermaid');
  });

  it('writes a generated user-components module with empty map by default', () => {
    const dir = prep();
    const generated = readFileSync(join(dir, 'src', 'generated', 'user-components.ts'), 'utf8');
    expect(generated).toContain('export const userComponents = {} as const;');
  });

  it('is idempotent — running twice does not throw', () => {
    const dir = prep();
    expect(() => prepareEntryFiles(dir, join(dir, 'docs'))).not.toThrow();
  });
});

describe('writeGeneratedBuiltInComponents', () => {
  function builtInFile(overrides: Partial<ResolvedConfig> = {}): string {
    const dir = join(tmpRoot, `bic-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    writeGeneratedBuiltInComponents(dir, baseConfig(overrides));
    return readFileSync(join(dir, 'src', 'generated', 'built-in-components.ts'), 'utf8');
  }

  it('writes the generated file to src/generated/built-in-components.ts', () => {
    const dir = join(tmpRoot, `bic-path-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const outputPath = writeGeneratedBuiltInComponents(dir, baseConfig());
    expect(outputPath).toBe(join(dir, 'src', 'generated', 'built-in-components.ts'));
  });

  it('exports empty builtInComponents when mermaid is false', () => {
    expect(builtInFile({ components: { mermaid: false } })).toContain(
      'export const builtInComponents = {} as const;',
    );
  });

  it('does not import Mermaid component when mermaid is false', () => {
    expect(builtInFile({ components: { mermaid: false } })).not.toContain('Mermaid');
  });

  it('imports Mermaid and registers it when mermaid is true', () => {
    const output = builtInFile({ components: { mermaid: true } });
    expect(output).toContain("import { Mermaid } from '../components/Mermaid'");
    expect(output).toContain('Mermaid');
  });

  it('exports builtInComponents with Mermaid when mermaid is true', () => {
    expect(builtInFile({ components: { mermaid: true } })).toContain(
      'export const builtInComponents = { Mermaid } as const;',
    );
  });
});

describe('writeGeneratedUserComponents', () => {
  function setupUserRoot() {
    const rootDir = join(tmpRoot, `uc-${Math.random().toString(36).slice(2)}`);
    const litmdxDir = join(rootDir, '.litmdx');
    mkdirSync(litmdxDir, { recursive: true });
    return { rootDir, litmdxDir };
  }

  function userComponentsFile(rootDir: string): string {
    return join(rootDir, '.litmdx', 'src', 'generated', 'user-components.ts');
  }

  it('writes the generated file to src/generated/user-components.ts', () => {
    const { rootDir, litmdxDir } = setupUserRoot();
    const outputPath = writeGeneratedUserComponents(litmdxDir, rootDir);
    expect(outputPath).toBe(userComponentsFile(rootDir));
  });

  it('exports empty userComponents when no src/components/index exists', () => {
    const { rootDir, litmdxDir } = setupUserRoot();
    writeGeneratedUserComponents(litmdxDir, rootDir);
    expect(readFileSync(userComponentsFile(rootDir), 'utf8')).toContain(
      'export const userComponents = {} as const;',
    );
  });

  it('imports src/components/index.ts when present', () => {
    const { rootDir, litmdxDir } = setupUserRoot();
    const userComponentsDir = join(rootDir, 'src', 'components');
    mkdirSync(userComponentsDir, { recursive: true });
    writeFileSync(join(userComponentsDir, 'index.ts'), 'export default {}\n', 'utf8');

    writeGeneratedUserComponents(litmdxDir, rootDir);

    expect(readFileSync(userComponentsFile(rootDir), 'utf8')).toContain(
      "import * as UserComponentsModule from '../../../src/components/index.ts';",
    );
  });

  it('prefers src/components/index.tsx when both tsx and ts are present', () => {
    const { rootDir, litmdxDir } = setupUserRoot();
    const userComponentsDir = join(rootDir, 'src', 'components');
    mkdirSync(userComponentsDir, { recursive: true });
    writeFileSync(join(userComponentsDir, 'index.ts'), 'export default {}\n', 'utf8');
    writeFileSync(join(userComponentsDir, 'index.tsx'), 'export default {}\n', 'utf8');

    writeGeneratedUserComponents(litmdxDir, rootDir);

    expect(readFileSync(userComponentsFile(rootDir), 'utf8')).toContain(
      "import * as UserComponentsModule from '../../../src/components/index.tsx';",
    );
  });

  it('resolves mdxComponents before default export for explicit component map contracts', () => {
    const { rootDir, litmdxDir } = setupUserRoot();
    const userComponentsDir = join(rootDir, 'src', 'components');
    mkdirSync(userComponentsDir, { recursive: true });
    writeFileSync(join(userComponentsDir, 'index.ts'), 'export default {}\n', 'utf8');

    writeGeneratedUserComponents(litmdxDir, rootDir);

    const generated = readFileSync(userComponentsFile(rootDir), 'utf8');
    expect(generated).toContain('mdxComponents?: unknown');
    expect(generated).toContain('default?: unknown');
  });
});
