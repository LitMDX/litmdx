/**
 * Unit tests for route-resolver.ts.
 *
 * Covers both resolveDocRoute (used by docs-index) and resolveIndexedRoutes
 * (used by pagefind-index), including the multi-section mode logic.
 *
 * All tests are pure — no file I/O, no mocks needed.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveDocRoute,
  isMultiSectionMode,
  rewriteHomeRoutes,
  resolveIndexedRoutes,
} from '../../src/search/route-resolver.js';
import { fileToImportKey } from '../../src/utils/fs.js';

// ---------------------------------------------------------------------------
// resolveDocRoute — per-file route (used by docs-index, includes all files)
// ---------------------------------------------------------------------------

describe('resolveDocRoute — basic mapping', () => {
  let root: string;
  let docsDir: string;

  // We need real paths on disk for fileToRoute to compute relative paths.
  // Use beforeEach-style inline setup to keep each test independent.
  function setup() {
    root = join(tmpdir(), `litmdx-rr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    return { root, docsDir };
  }
  function teardown() {
    rmSync(root, { recursive: true, force: true });
  }

  it('maps docs/index.mdx to /', () => {
    const { docsDir } = setup();
    const file = join(docsDir, 'index.mdx');
    writeFileSync(file, '');
    expect(resolveDocRoute(file, docsDir)).toBe('/');
    teardown();
  });

  it('maps docs/guide.mdx to /guide', () => {
    const { docsDir } = setup();
    const file = join(docsDir, 'guide.mdx');
    writeFileSync(file, '');
    expect(resolveDocRoute(file, docsDir)).toBe('/guide');
    teardown();
  });

  it('maps docs/guide/install.mdx to /guide/install', () => {
    const { docsDir } = setup();
    mkdirSync(join(docsDir, 'guide'), { recursive: true });
    const file = join(docsDir, 'guide', 'install.mdx');
    writeFileSync(file, '');
    expect(resolveDocRoute(file, docsDir)).toBe('/guide/install');
    teardown();
  });

  it('maps docs/guide/index.mdx to /guide', () => {
    const { docsDir } = setup();
    mkdirSync(join(docsDir, 'guide'), { recursive: true });
    const file = join(docsDir, 'guide', 'index.mdx');
    writeFileSync(file, '');
    expect(resolveDocRoute(file, docsDir)).toBe('/guide');
    teardown();
  });
});

describe('resolveDocRoute — home prefix rewriting', () => {
  let root: string;
  let docsDir: string;

  function setup() {
    root = join(tmpdir(), `litmdx-rr-home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
  }
  function teardown() {
    rmSync(root, { recursive: true, force: true });
  }

  it('rewrites docs/home/index.mdx to /', () => {
    setup();
    mkdirSync(join(docsDir, 'home'), { recursive: true });
    const file = join(docsDir, 'home', 'index.mdx');
    writeFileSync(file, '');
    expect(resolveDocRoute(file, docsDir)).toBe('/');
    teardown();
  });

  it('rewrites docs/home/basics/intro.mdx to /basics/intro', () => {
    setup();
    mkdirSync(join(docsDir, 'home', 'basics'), { recursive: true });
    const file = join(docsDir, 'home', 'basics', 'intro.mdx');
    writeFileSync(file, '');
    expect(resolveDocRoute(file, docsDir)).toBe('/basics/intro');
    teardown();
  });

  it('keeps non-home section paths unchanged', () => {
    setup();
    mkdirSync(join(docsDir, 'reference'), { recursive: true });
    const file = join(docsDir, 'reference', 'cli.mdx');
    writeFileSync(file, '');
    expect(resolveDocRoute(file, docsDir)).toBe('/reference/cli');
    teardown();
  });
});

// ---------------------------------------------------------------------------
// isMultiSectionMode
// ---------------------------------------------------------------------------

describe('isMultiSectionMode', () => {
  it('returns false when there are no /home routes', () => {
    const routes = [
      { path: '/', importKey: 'a' },
      { path: '/guide', importKey: 'b' },
    ];
    expect(isMultiSectionMode(routes)).toBe(false);
  });

  it('returns true when a route has path === "/home"', () => {
    const routes = [{ path: '/home', importKey: 'a' }];
    expect(isMultiSectionMode(routes)).toBe(true);
  });

  it('returns true when a route starts with "/home/"', () => {
    const routes = [{ path: '/home/basics', importKey: 'a' }];
    expect(isMultiSectionMode(routes)).toBe(true);
  });

  it('returns false for an empty array', () => {
    expect(isMultiSectionMode([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rewriteHomeRoutes
// ---------------------------------------------------------------------------

describe('rewriteHomeRoutes', () => {
  it('returns the input unchanged in single-section mode', () => {
    const routes = [
      { path: '/', importKey: 'a' },
      { path: '/guide', importKey: 'b' },
    ];
    expect(rewriteHomeRoutes(routes)).toEqual(routes);
  });

  it('rewrites /home to / in multi-section mode', () => {
    const routes = [
      { path: '/home', importKey: 'a' },
      { path: '/reference/cli', importKey: 'b' },
    ];
    const result = rewriteHomeRoutes(routes);
    expect(result.find((r) => r.importKey === 'a')?.path).toBe('/');
  });

  it('rewrites /home/basics to /basics in multi-section mode', () => {
    const routes = [
      { path: '/home', importKey: 'a' },
      { path: '/home/basics', importKey: 'b' },
      { path: '/reference/cli', importKey: 'c' },
    ];
    const result = rewriteHomeRoutes(routes);
    expect(result.find((r) => r.importKey === 'b')?.path).toBe('/basics');
  });

  it('keeps non-home section routes in multi-section mode', () => {
    const routes = [
      { path: '/home', importKey: 'a' },
      { path: '/reference/cli', importKey: 'b' },
    ];
    const result = rewriteHomeRoutes(routes);
    expect(result.some((r) => r.path === '/reference/cli')).toBe(true);
  });

  it('excludes loose root-level files in multi-section mode', () => {
    const routes = [
      { path: '/home', importKey: 'a' },
      { path: '/reference/cli', importKey: 'b' },
      { path: '/loose', importKey: 'c' }, // root-level, not in a section
    ];
    const result = rewriteHomeRoutes(routes);
    expect(result.some((r) => r.path === '/loose')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveIndexedRoutes — integration (file paths on disk)
// ---------------------------------------------------------------------------

describe('resolveIndexedRoutes', () => {
  let root: string;
  let docsDir: string;

  function setup() {
    root = join(tmpdir(), `litmdx-rir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
  }
  function teardown() {
    rmSync(root, { recursive: true, force: true });
  }

  function mkfile(rel: string) {
    const full = join(docsDir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, '');
    return full;
  }

  it('returns a map of importKey → routeUrl in single-section mode', () => {
    setup();
    const f1 = mkfile('index.mdx');
    const f2 = mkfile('guide.mdx');

    const map = resolveIndexedRoutes([f1, f2], docsDir);

    expect(map.get(fileToImportKey(f1, docsDir))).toBe('/');
    expect(map.get(fileToImportKey(f2, docsDir))).toBe('/guide');
    teardown();
  });

  it('indexes rewritten /home routes in multi-section mode', () => {
    setup();
    mkdirSync(join(docsDir, 'home', 'features'), { recursive: true });
    mkdirSync(join(docsDir, 'reference'), { recursive: true });

    const fHome = mkfile('home/index.mdx');
    const fFeature = mkfile('home/features/webmcp.mdx');
    const fRef = mkfile('reference/cli.mdx');

    const map = resolveIndexedRoutes([fHome, fFeature, fRef], docsDir);

    expect(map.get(fileToImportKey(fHome, docsDir))).toBe('/');
    expect(map.get(fileToImportKey(fFeature, docsDir))).toBe('/features/webmcp');
    expect(map.get(fileToImportKey(fRef, docsDir))).toBe('/reference/cli');
    teardown();
  });

  it('does not include raw /home path in the map', () => {
    setup();
    const fHome = mkfile('home/index.mdx');
    const fRef = mkfile('reference/cli.mdx');

    const map = resolveIndexedRoutes([fHome, fRef], docsDir);

    const values = [...map.values()];
    expect(values.every((v) => !v.startsWith('/home'))).toBe(true);
    teardown();
  });

  it('excludes loose root-level files in multi-section mode', () => {
    setup();
    const fHome = mkfile('home/index.mdx');
    const fLoose = mkfile('loose.mdx');
    const fRef = mkfile('reference/cli.mdx');

    const map = resolveIndexedRoutes([fHome, fLoose, fRef], docsDir);

    expect(map.has(fileToImportKey(fLoose, docsDir))).toBe(false);
    teardown();
  });
});
