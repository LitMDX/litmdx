/**
 * Direct tests for buildCommand.
 *
 * All heavy dependencies (vite, prerender, search, sitemap) are mocked so
 * that the tests run in milliseconds and focus exclusively on the orchestration
 * logic inside buildCommand — conditional branches, error recovery, and
 * console output.
 *
 * Integration-level tests (e.g. sitemap.xml file written to disk) live in
 * tests/commands/run.test.ts under the "run — build" describe block.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCommand } from '../../src/commands/build.js';

// ---------------------------------------------------------------------------
// Hoisted mock factories (vi.mock calls are hoisted before imports)
// ---------------------------------------------------------------------------

const {
  mockBuild,
  mockBuildViteConfig,
  mockLoadUserConfig,
  mockPrerenderStaticRoutes,
  mockBuildPagefindIndex,
  mockBuildDocsIndex,
  mockBuildSitemap,
  mockBuildRobots,
} = vi.hoisted(() => ({
  mockBuild: vi.fn(),
  mockBuildViteConfig: vi.fn(),
  mockLoadUserConfig: vi.fn(),
  mockPrerenderStaticRoutes: vi.fn(),
  mockBuildPagefindIndex: vi.fn(),
  mockBuildDocsIndex: vi.fn(),
  mockBuildSitemap: vi.fn(),
  mockBuildRobots: vi.fn(),
}));

vi.mock('vite', () => ({
  build: (...args: unknown[]) => mockBuild(...args),
  // createServer is not used in build, but must be present to avoid import errors
  createServer: vi.fn(),
}));

vi.mock('../../src/vite/index.js', () => ({
  buildViteConfig: (...args: unknown[]) => mockBuildViteConfig(...args),
  loadUserConfig: (...args: unknown[]) => mockLoadUserConfig(...args),
}));

vi.mock('../../src/ssg/prerender.js', () => ({
  prerenderStaticRoutes: (...args: unknown[]) => mockPrerenderStaticRoutes(...args),
}));

vi.mock('../../src/search/pagefind-index.js', () => ({
  buildPagefindIndex: (...args: unknown[]) => mockBuildPagefindIndex(...args),
}));

vi.mock('../../src/search/docs-index.js', () => ({
  buildDocsIndex: (...args: unknown[]) => mockBuildDocsIndex(...args),
}));

vi.mock('../../src/sitemap/build.js', () => ({
  buildSitemap: (...args: unknown[]) => mockBuildSitemap(...args),
}));

vi.mock('../../src/sitemap/robots.js', () => ({
  buildRobots: (...args: unknown[]) => mockBuildRobots(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_ROOT = '/fake/project';
const FAKE_OUT_DIR = '/fake/project/dist';
const fakeViteConfig = { configFile: false, build: { outDir: FAKE_OUT_DIR } };

function setupDefaultMocks() {
  mockBuild.mockResolvedValue(undefined);
  mockBuildViteConfig.mockResolvedValue(fakeViteConfig);
  mockLoadUserConfig.mockResolvedValue({});
  mockPrerenderStaticRoutes.mockResolvedValue(undefined);
  mockBuildPagefindIndex.mockResolvedValue(undefined);
  mockBuildDocsIndex.mockReturnValue(undefined);
  mockBuildSitemap.mockResolvedValue(undefined);
  mockBuildRobots.mockReturnValue(undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

describe('buildCommand — core pipeline', () => {
  it('calls vite build() with the resolved vite config', async () => {
    await buildCommand(FAKE_ROOT);
    expect(mockBuild).toHaveBeenCalledWith(fakeViteConfig);
  });

  it('calls prerenderStaticRoutes with root and vite config', async () => {
    await buildCommand(FAKE_ROOT);
    expect(mockPrerenderStaticRoutes).toHaveBeenCalledWith(FAKE_ROOT, fakeViteConfig);
  });

  it('calls buildPagefindIndex with docsDir and outDir', async () => {
    await buildCommand(FAKE_ROOT);
    expect(mockBuildPagefindIndex).toHaveBeenCalledWith(
      expect.stringContaining('docs'),
      FAKE_OUT_DIR,
    );
  });

  it('calls buildRobots with outDir', async () => {
    await buildCommand(FAKE_ROOT);
    expect(mockBuildRobots).toHaveBeenCalledOnce();
    expect(mockBuildRobots.mock.calls[0][0]).toBe(FAKE_OUT_DIR);
  });

  it('does not throw when all steps succeed', async () => {
    await expect(buildCommand(FAKE_ROOT)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// agent.enabled branch
// ---------------------------------------------------------------------------

describe('buildCommand — agent.enabled branch', () => {
  it('calls buildDocsIndex when agent.enabled is true', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({ agent: { enabled: true } });
    await buildCommand(FAKE_ROOT);
    expect(mockBuildDocsIndex).toHaveBeenCalledOnce();
  });

  it('calls buildDocsIndex with docsDir and outDir', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({ agent: { enabled: true } });
    await buildCommand(FAKE_ROOT);
    expect(mockBuildDocsIndex).toHaveBeenCalledWith(
      expect.stringContaining('docs'),
      FAKE_OUT_DIR,
    );
  });

  it('does NOT call buildDocsIndex when agent is not configured', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({});
    await buildCommand(FAKE_ROOT);
    expect(mockBuildDocsIndex).not.toHaveBeenCalled();
  });

  it('does NOT call buildDocsIndex when agent.enabled is false', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({ agent: { enabled: false } });
    await buildCommand(FAKE_ROOT);
    expect(mockBuildDocsIndex).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// siteUrl branch
// ---------------------------------------------------------------------------

describe('buildCommand — siteUrl branch', () => {
  it('calls buildSitemap when siteUrl is set', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({ siteUrl: 'https://example.com' });
    await buildCommand(FAKE_ROOT);
    expect(mockBuildSitemap).toHaveBeenCalledOnce();
  });

  it('calls buildSitemap with docsDir, outDir, siteUrl, and baseUrl', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({ siteUrl: 'https://example.com', baseUrl: '/docs/' });
    await buildCommand(FAKE_ROOT);
    expect(mockBuildSitemap).toHaveBeenCalledWith(
      expect.stringContaining('docs'),
      FAKE_OUT_DIR,
      'https://example.com',
      '/docs/',
    );
  });

  it('does NOT call buildSitemap when siteUrl is absent', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({});
    await buildCommand(FAKE_ROOT);
    expect(mockBuildSitemap).not.toHaveBeenCalled();
  });

  it('calls buildRobots regardless of siteUrl', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({});
    await buildCommand(FAKE_ROOT);
    expect(mockBuildRobots).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Error recovery — each step warns but never throws
// ---------------------------------------------------------------------------

describe('buildCommand — error recovery', () => {
  it('warns and does not throw when buildPagefindIndex fails', async () => {
    mockBuildPagefindIndex.mockRejectedValueOnce(new Error('pagefind binary missing'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(buildCommand(FAKE_ROOT)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('pagefind'));
  });

  it('warns and does not throw when buildDocsIndex fails', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({ agent: { enabled: true } });
    mockBuildDocsIndex.mockImplementationOnce(() => {
      throw new Error('docs-index write failed');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(buildCommand(FAKE_ROOT)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('docs-index'));
  });

  it('warns and does not throw when buildSitemap fails', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({ siteUrl: 'https://example.com' });
    mockBuildSitemap.mockRejectedValueOnce(new Error('sitemap io error'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(buildCommand(FAKE_ROOT)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sitemap'));
  });

  it('warns and does not throw when buildRobots fails', async () => {
    mockBuildRobots.mockImplementationOnce(() => {
      throw new Error('robots write failed');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(buildCommand(FAKE_ROOT)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('robots'));
  });

  it('continues remaining steps after pagefind failure', async () => {
    mockBuildPagefindIndex.mockRejectedValueOnce(new Error('pagefind not found'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await buildCommand(FAKE_ROOT);

    // buildRobots must still run even if pagefind failed
    expect(mockBuildRobots).toHaveBeenCalledOnce();
  });

  it('continues remaining steps after buildDocsIndex failure', async () => {
    mockLoadUserConfig.mockResolvedValueOnce({
      agent: { enabled: true },
      siteUrl: 'https://example.com',
    });
    mockBuildDocsIndex.mockImplementationOnce(() => {
      throw new Error('io error');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await buildCommand(FAKE_ROOT);

    // buildSitemap and buildRobots must still run
    expect(mockBuildSitemap).toHaveBeenCalledOnce();
    expect(mockBuildRobots).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------

describe('buildCommand — console output', () => {
  it('logs a start message before building', async () => {
    let startCalled = false;
    vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      if (typeof msg === 'string' && msg.includes('litmdx building')) {
        startCalled = true;
        // build must not have been called yet
        expect(mockBuild).not.toHaveBeenCalled();
      }
    });

    await buildCommand(FAKE_ROOT);

    expect(startCalled).toBe(true);
  });

  it('logs a completion message after building', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await buildCommand(FAKE_ROOT);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('build complete'));
  });

  it('logs both start and completion messages', async () => {
    const messages: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: string) => messages.push(msg));

    await buildCommand(FAKE_ROOT);

    const joined = messages.join('\n');
    expect(joined).toContain('building');
    expect(joined).toContain('complete');
  });
});

// ---------------------------------------------------------------------------
// outDir resolution
// ---------------------------------------------------------------------------

describe('buildCommand — outDir resolution', () => {
  it('uses viteConfig.build.outDir when present', async () => {
    const customOutDir = '/custom/output/dir';
    mockBuildViteConfig.mockResolvedValueOnce({
      configFile: false,
      build: { outDir: customOutDir },
    });
    mockLoadUserConfig.mockResolvedValueOnce({ agent: { enabled: true } });

    await buildCommand(FAKE_ROOT);

    expect(mockBuildDocsIndex).toHaveBeenCalledWith(
      expect.any(String),
      customOutDir,
    );
  });
});
