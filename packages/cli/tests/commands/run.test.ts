import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import net from 'net';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Mocks for run() ─────────────────────────────────────────────────────────

// Mock vite before importing commands so createServer/build are captured.
const mockListen = vi.fn().mockResolvedValue(undefined);
const mockPrintUrls = vi.fn();
const mockCreateServer = vi.fn().mockResolvedValue({ listen: mockListen, printUrls: mockPrintUrls });
const mockBuild = vi.fn().mockResolvedValue(undefined);

vi.mock('vite', () => ({
  createServer: (...args: unknown[]) => mockCreateServer(...args),
  build: (...args: unknown[]) => mockBuild(...args),
}));

const mockBuildViteConfig = vi.fn().mockResolvedValue({ configFile: false });
const mockLoadUserConfig = vi.fn().mockResolvedValue({});
vi.mock('../../src/vite/index.js', () => ({
  buildViteConfig: (...args: unknown[]) => mockBuildViteConfig(...args),
  loadUserConfig: (...args: unknown[]) => mockLoadUserConfig(...args),
}));

const mockPrerenderStaticRoutes = vi.fn().mockResolvedValue(undefined);
vi.mock('../../src/ssg/prerender.js', () => ({
  prerenderStaticRoutes: (...args: unknown[]) => mockPrerenderStaticRoutes(...args),
}));



const { isPortFree, findFreePort, run } = await import('../../src/commands/index.js');

// ─── isPortFree ─────────────────────────────────────────────────────────────

describe('isPortFree', () => {
  it('returns true for a port with no listener', async () => {
    // Port 59999 is in the ephemeral/private range and is almost always free.
    const free = await isPortFree(59999);
    expect(free).toBe(true);
  });

  it('returns false when a server is already listening on the port', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(59998, '127.0.0.1', resolve));
    try {
      const free = await isPortFree(59998);
      expect(free).toBe(false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

// ─── findFreePort ────────────────────────────────────────────────────────────

describe('findFreePort', () => {
  it('returns a port within the default range (5173–5200)', async () => {
    const port = await findFreePort();
    expect(port).toBeGreaterThanOrEqual(5173);
    expect(port).toBeLessThanOrEqual(5200);
  });

  it('returns the start port when it is free', async () => {
    // Use a narrow range in the high ephemeral space so collisions are unlikely.
    const port = await findFreePort(59994, 59996);
    expect(port).toBe(59994);
  });

  it('skips occupied ports and returns the next available one', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(59990, '127.0.0.1', resolve));
    try {
      const port = await findFreePort(59990, 59993);
      expect(port).toBe(59991);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('throws when every port in the range is occupied', async () => {
    const servers: net.Server[] = [];
    const ports = [59980, 59981];
    for (const p of ports) {
      const s = net.createServer();
      await new Promise<void>((resolve) => s.listen(p, '127.0.0.1', resolve));
      servers.push(s);
    }
    try {
      await expect(findFreePort(59980, 59981)).rejects.toThrow(
        'No free port found between 59980 and 59981',
      );
    } finally {
      await Promise.all(
        servers.map((s) => new Promise<void>((resolve) => s.close(() => resolve()))),
      );
    }
  });
});

// ─── run ─────────────────────────────────────────────────────────────────────

describe('run — dev', () => {
  const opts = { root: '/fake/root' };

  beforeEach(() => {
    mockBuildViteConfig.mockClear();
    mockCreateServer.mockClear();
    mockListen.mockClear();
    mockPrintUrls.mockClear();
  });

  it('calls buildViteConfig with root and a port', async () => {
    await run('dev', opts);
    expect(mockBuildViteConfig).toHaveBeenCalledOnce();
    const [calledRoot] = mockBuildViteConfig.mock.calls[0] as [string, number];
    expect(calledRoot).toBe('/fake/root');
  });

  it('passes a numeric port to buildViteConfig', async () => {
    await run('dev', opts);
    const [, port] = mockBuildViteConfig.mock.calls[0] as [string, number];
    expect(typeof port).toBe('number');
  });

  it('calls createServer with the config returned by buildViteConfig', async () => {
    const fakeConfig = { configFile: false, root: '/fake/.litmdx' };
    mockBuildViteConfig.mockResolvedValueOnce(fakeConfig);
    await run('dev', opts);
    expect(mockCreateServer).toHaveBeenCalledWith(fakeConfig);
  });

  it('calls server.listen()', async () => {
    await run('dev', opts);
    expect(mockListen).toHaveBeenCalledOnce();
  });

  it('calls server.printUrls()', async () => {
    await run('dev', opts);
    expect(mockPrintUrls).toHaveBeenCalledOnce();
  });

  it('does not call build() for dev command', async () => {
    await run('dev', opts);
    expect(mockBuild).not.toHaveBeenCalled();
  });
});

describe('run — build', () => {
  const opts = { root: '/fake/root' };

  beforeEach(() => {
    mockBuildViteConfig.mockClear();
    mockBuild.mockClear();
    mockCreateServer.mockClear();
    mockLoadUserConfig.mockClear();
    mockPrerenderStaticRoutes.mockClear();
  });

  it('calls buildViteConfig with root', async () => {
    await run('build', opts);
    expect(mockBuildViteConfig).toHaveBeenCalledOnce();
    const [calledRoot] = mockBuildViteConfig.mock.calls[0] as [string];
    expect(calledRoot).toBe('/fake/root');
  });

  it('calls build() with the config returned by buildViteConfig', async () => {
    const fakeConfig = { configFile: false, root: '/fake/.litmdx' };
    mockBuildViteConfig.mockResolvedValueOnce(fakeConfig);
    await run('build', opts);
    expect(mockBuild).toHaveBeenCalledWith(fakeConfig);
  });

  it('does not call createServer() for build command', async () => {
    await run('build', opts);
    expect(mockCreateServer).not.toHaveBeenCalled();
  });

  it('prerenders static routes after the client build', async () => {
    const fakeConfig = { configFile: false, root: '/fake/.litmdx', build: { outDir: '/fake/dist' } };
    mockBuildViteConfig.mockResolvedValueOnce(fakeConfig);
    await run('build', opts);
    expect(mockPrerenderStaticRoutes).toHaveBeenCalledWith('/fake/root', fakeConfig);
  });

  it('writes sitemap.xml with baseUrl when siteUrl is configured', async () => {
    const buildRoot = join(tmpdir(), `litmdx-build-test-${Date.now()}`);
    const docsRoot = join(buildRoot, 'docs');
    const outDir = join(buildRoot, 'dist');

    mkdirSync(docsRoot, { recursive: true });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(docsRoot, 'index.mdx'), '# Home\n', 'utf8');
    writeFileSync(join(docsRoot, 'guide.mdx'), '# Guide\n', 'utf8');

    const fakeConfig = { configFile: false, root: join(buildRoot, '.litmdx'), build: { outDir } };
    mockBuildViteConfig.mockResolvedValueOnce(fakeConfig);
    mockLoadUserConfig.mockResolvedValueOnce({
      siteUrl: 'https://example.com',
      baseUrl: '/docs/',
      docsDir: 'docs',
    });

    await run('build', { root: buildRoot });

    const sitemapXml = readFileSync(join(outDir, 'sitemap.xml'), 'utf8');
    expect(sitemapXml).toContain('<loc>https://example.com/docs/</loc>');
    expect(sitemapXml).toContain('<loc>https://example.com/docs/guide</loc>');

    rmSync(buildRoot, { recursive: true, force: true });
  });

  it('writes robots.txt with Sitemap directive when siteUrl is configured', async () => {
    const buildRoot = join(tmpdir(), `litmdx-build-robots-${Date.now()}`);
    const docsRoot = join(buildRoot, 'docs');
    const outDir = join(buildRoot, 'dist');

    mkdirSync(docsRoot, { recursive: true });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(docsRoot, 'index.mdx'), '# Home\n', 'utf8');

    const fakeConfig = { configFile: false, root: join(buildRoot, '.litmdx'), build: { outDir } };
    mockBuildViteConfig.mockResolvedValueOnce(fakeConfig);
    mockLoadUserConfig.mockResolvedValueOnce({
      siteUrl: 'https://example.com',
      docsDir: 'docs',
    });

    await run('build', { root: buildRoot });

    const robots = readFileSync(join(outDir, 'robots.txt'), 'utf8');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');

    rmSync(buildRoot, { recursive: true, force: true });
  });

  it('writes robots.txt without Sitemap directive when siteUrl is not configured', async () => {
    const buildRoot = join(tmpdir(), `litmdx-build-robots-nourl-${Date.now()}`);
    const docsRoot = join(buildRoot, 'docs');
    const outDir = join(buildRoot, 'dist');

    mkdirSync(docsRoot, { recursive: true });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(docsRoot, 'index.mdx'), '# Home\n', 'utf8');

    const fakeConfig = { configFile: false, root: join(buildRoot, '.litmdx'), build: { outDir } };
    mockBuildViteConfig.mockResolvedValueOnce(fakeConfig);
    mockLoadUserConfig.mockResolvedValueOnce({ docsDir: 'docs' });

    await run('build', { root: buildRoot });

    const robots = readFileSync(join(outDir, 'robots.txt'), 'utf8');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).not.toContain('Sitemap:');

    rmSync(buildRoot, { recursive: true, force: true });
  });
});

// ─── run — init ───────────────────────────────────────────────────────────────
// These tests run the real init command in a temporary directory so that no
// vi.mock('fs') is needed. This avoids leaking module mocks to other test files
// when bun test runs all files in the same worker.

describe('run — init', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = join(tmpdir(), `litmdx-cmd-test-${Date.now()}`);
    mkdirSync(tmpRoot, { recursive: true });
  });

  afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

  beforeEach(() => {
    // Wipe the directory between tests so each test gets a clean slate.
    rmSync(tmpRoot, { recursive: true, force: true });
    mkdirSync(tmpRoot, { recursive: true });
    mockCreateServer.mockClear();
    mockBuild.mockClear();
  });

  it('creates package.json with dev and build scripts', async () => {
    await run('init', { root: tmpRoot });
    const content = readFileSync(join(tmpRoot, 'package.json'), 'utf8');
    expect(content).toContain('"dev": "litmdx dev"');
    expect(content).toContain('"build": "litmdx build"');
  });

  it('skips creating package.json when one already exists', async () => {
    mkdirSync(tmpRoot, { recursive: true });
    // Pre-create package.json so init skips it.
    const existing = '{"name":"existing"}';
    const pkgPath = join(tmpRoot, 'package.json');
    writeFileSync(pkgPath, existing);

    await run('init', { root: tmpRoot });

    // The file should still have the original content (not overwritten).
    expect(readFileSync(pkgPath, 'utf8')).toBe(existing);
  });

  it('creates litmdx.config.ts in the project root', async () => {
    await run('init', { root: tmpRoot });
    const content = readFileSync(join(tmpRoot, 'litmdx.config.ts'), 'utf8');
    expect(content).toContain('defineConfig');
  });

  it('creates docs/index.mdx in the project root', async () => {
    await run('init', { root: tmpRoot });
    expect(existsSync(join(tmpRoot, 'docs', 'index.mdx'))).toBe(true);
  });

  it('creates the docs directory', async () => {
    await run('init', { root: tmpRoot });
    expect(existsSync(join(tmpRoot, 'docs'))).toBe(true);
  });

  it('calls process.exit(1) when litmdx.config.ts already exists', async () => {
    // Pre-create litmdx.config.ts to trigger the abort path.
    writeFileSync(join(tmpRoot, 'litmdx.config.ts'), '');
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => { throw new Error('process.exit'); });

    await expect(run('init', { root: tmpRoot })).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('does not call createServer() or build() for init command', async () => {
    await run('init', { root: tmpRoot });
    expect(mockCreateServer).not.toHaveBeenCalled();
    expect(mockBuild).not.toHaveBeenCalled();
  });
});
