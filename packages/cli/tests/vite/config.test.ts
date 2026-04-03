import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock heavy Vite plugins so buildViteConfig can run in a test environment
// without loading the full MDX/React plugin chains.
vi.mock('@vitejs/plugin-react', () => ({
  default: () => ({ name: 'vite:react' }),
}));

vi.mock('@litmdx/core/vite-plugin', () => ({
  createVitePlugin: () => [{ name: 'litmdx:core-mock' }],
}));

// Import AFTER mocks are registered.
const { buildViteConfig } = await import('../../src/vite/config.js');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpRoot = join(tmpdir(), `litmdx-config-test-${Date.now()}`);

beforeAll(() => mkdirSync(tmpRoot, { recursive: true }));
afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

// ─── buildViteConfig ─────────────────────────────────────────────────────────

describe('buildViteConfig', () => {
  it('returns a config object (not null, not array)', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    expect(cfg).toBeDefined();
    expect(typeof cfg).toBe('object');
    expect(Array.isArray(cfg)).toBe(false);
  });

  it('sets configFile to false', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    expect(cfg.configFile).toBe(false);
  });

  it('defaults Vite base to /', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    expect(cfg.base).toBe('/');
  });

  it('sets root to the .litmdx sub-directory of the provided root', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    expect(cfg.root).toBe(join(tmpRoot, '.litmdx'));
  });

  it('uses the provided port in server.port', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev', 7777);
    expect((cfg.server as { port: number }).port).toBe(7777);
  });

  it('defaults server.port to 5173 when port is omitted', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    expect((cfg.server as { port: number }).port).toBe(5173);
  });

  it('sets server.strictPort to false to allow fallback to next available port', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    expect((cfg.server as { strictPort: boolean }).strictPort).toBe(false);
  });

  it('includes plugins array with at least the react and virtual-config plugins', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const names = (cfg.plugins as Array<{ name: string }>)
      .flat()
      .map((p) => p?.name)
      .filter(Boolean);
    expect(names).toContain('vite:react');
    expect(names).toContain('litmdx:virtual-config');
    expect(names).toContain('litmdx:html-fallback');
    expect(names).toContain('litmdx:user-components-watcher');
  });

  it('excludes @litmdx/core from optimizeDeps', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const excluded = (cfg.optimizeDeps as { exclude: string[] }).exclude;
    expect(excluded).toContain('@litmdx/core');
  });

  it('sets build.outDir to dist/ inside the provided root', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'build');
    expect((cfg.build as { outDir: string }).outDir).toBe(join(tmpRoot, 'dist'));
  });

  it('omits rollupOptions.output when mermaid is disabled (default)', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'build');
    const output = (cfg.build as { rollupOptions: { output: unknown } }).rollupOptions.output;
    expect(output).toBeUndefined();
  });

  it('sets manualChunks in rollupOptions.output when mermaid is enabled', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'build', 5173, { components: { mermaid: true } });
    const output = (
      cfg.build as { rollupOptions: { output: { manualChunks: (id: string) => string | undefined } } }
    ).rollupOptions.output;
    expect(typeof output?.manualChunks).toBe('function');
    expect(output.manualChunks('/node_modules/mermaid/dist/mermaid.js')).toBe('mermaid');
    expect(output.manualChunks('/node_modules/d3-scale/src/index.js')).toBe('mermaid');
    expect(output.manualChunks('/node_modules/react/index.js')).toBeUndefined();
  });

  it('sets resolve.dedupe to include react and react-dom', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const dedupe = (cfg.resolve as { dedupe: string[] }).dedupe;
    expect(dedupe).toContain('react');
    expect(dedupe).toContain('react-dom');
  });

  it('sets resolve aliases for react and react-dom families', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const alias = cfg.resolve as { alias: Record<string, string> };

    expect(alias.alias['litmdx:config']).toBe('virtual:litmdx-config');
    expect(typeof alias.alias.react).toBe('string');
    expect(typeof alias.alias['react-dom']).toBe('string');
    expect(typeof alias.alias['react/jsx-runtime']).toBe('string');
    expect(typeof alias.alias['react/jsx-dev-runtime']).toBe('string');
  });

  it('works without a litmdx.config.ts and applies default config values', async () => {
    // tmpRoot has no litmdx.config.ts — loadUserConfig returns {}, resolveConfig gives defaults.
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    // The virtual-config plugin should be present, confirming resolveConfig ran.
    const names = (cfg.plugins as Array<{ name: string }>)
      .flat()
      .map((p) => p?.name)
      .filter(Boolean);
    expect(names).toContain('litmdx:virtual-config');
  });
});

// ─── loadUserConfig integration ──────────────────────────────────────────────

describe('buildViteConfig — loadUserConfig', () => {
  // Each test gets its own directory to avoid dynamic import() module caching
  // across tests that write to the same file path.
  function makeConfigRoot() {
    const dir = join(tmpdir(), `litmdx-userconfig-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  it('picks up title from an existing litmdx.config.ts', async () => {
    const configRoot = makeConfigRoot();
    writeFileSync(
      join(configRoot, 'litmdx.config.ts'),
      `export default { title: 'Custom Title' };\n`,
    );
    await buildViteConfig(configRoot, 'dev');
    const { readFileSync } = await import('fs');
    const indexHtml = readFileSync(join(configRoot, '.litmdx', 'index.html'), 'utf8');
    expect(indexHtml).toContain('<title>Custom Title</title>');
    rmSync(configRoot, { recursive: true, force: true });
  });

  it('picks up description from litmdx.config.ts', async () => {
    const configRoot = makeConfigRoot();
    writeFileSync(
      join(configRoot, 'litmdx.config.ts'),
      `export default { title: 'T', description: 'My desc' };\n`,
    );
    await buildViteConfig(configRoot, 'dev');
    const { readFileSync } = await import('fs');
    const indexHtml = readFileSync(join(configRoot, '.litmdx', 'index.html'), 'utf8');
    expect(indexHtml).toContain('content="My desc"');
    rmSync(configRoot, { recursive: true, force: true });
  });

  it('uses baseUrl from litmdx.config.ts as Vite base', async () => {
    const configRoot = makeConfigRoot();
    writeFileSync(
      join(configRoot, 'litmdx.config.ts'),
      `export default { baseUrl: '/docs/' };
`,
    );
    const cfg = await buildViteConfig(configRoot, 'build');
    expect(cfg.base).toBe('/docs/');
    rmSync(configRoot, { recursive: true, force: true });
  });
});

// ─── Workspace / monorepo ergonomics ─────────────────────────────────────────

describe('buildViteConfig — workspace ergonomics', () => {
  it('includes project root in server.fs.allow so files outside .litmdx/ are served', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const allow = (cfg.server as { fs: { allow: string[] } }).fs.allow;
    expect(allow).toContain(tmpRoot);
  });

  it('includes .litmdx dir in server.fs.allow', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const allow = (cfg.server as { fs: { allow: string[] } }).fs.allow;
    expect(allow).toContain(join(tmpRoot, '.litmdx'));
  });

  it('sets publicDir to project root public/ (not .litmdx/public/)', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    expect(cfg.publicDir).toBe(join(tmpRoot, 'public'));
  });

  it('excludes fsevents from optimizeDeps (native binding safety)', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const excluded = (cfg.optimizeDeps as { exclude: string[] }).exclude;
    expect(excluded).toContain('fsevents');
  });

  it('excludes @tailwindcss/oxide from optimizeDeps (native binding)', async () => {
    const cfg = await buildViteConfig(tmpRoot, 'dev');
    const excluded = (cfg.optimizeDeps as { exclude: string[] }).exclude;
    expect(excluded).toContain('@tailwindcss/oxide');
  });
});
