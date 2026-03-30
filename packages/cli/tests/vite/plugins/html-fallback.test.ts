import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { htmlFallbackPlugin } from '../../../src/vite/plugins/html-fallback.js';
import type { Plugin } from 'vite';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpBase = join(tmpdir(), `litmdx-html-fallback-test-${Date.now()}`);
const indexHtmlPath = join(tmpBase, 'index.html');
const RAW_HTML = '<html><body><div id="root"></div></body></html>';

beforeAll(() => {
  mkdirSync(tmpBase, { recursive: true });
  writeFileSync(indexHtmlPath, RAW_HTML, 'utf8');
});

afterAll(() => rmSync(tmpBase, { recursive: true, force: true }));

// ─── Helper: capture middleware via a mock ViteDevServer ──────────────────────

type Middleware = (req: any, res: any, next: any) => Promise<void>;

function getMiddleware(plugin: Plugin): Middleware {
  let captured: Middleware | undefined;
  const mockServer = {
    middlewares: {
      use: (fn: Middleware) => {
        captured = fn;
      },
    },
    transformIndexHtml: vi.fn().mockImplementation((_url: string, html: string) =>
      Promise.resolve(html),
    ),
  };
  (plugin.configureServer as unknown as (s: typeof mockServer) => void)(mockServer);
  return captured!;
}

// ─── Plugin shape ─────────────────────────────────────────────────────────────

describe('htmlFallbackPlugin', () => {
  it('returns a plugin with the correct name', () => {
    const plugin = htmlFallbackPlugin(indexHtmlPath);
    expect(plugin.name).toBe('litmdx:html-fallback');
  });

  it('defines a configureServer hook', () => {
    const plugin = htmlFallbackPlugin(indexHtmlPath);
    expect(typeof plugin.configureServer).toBe('function');
  });
});

// ─── Middleware: asset URLs ───────────────────────────────────────────────────

describe('htmlFallbackPlugin middleware — asset requests', () => {
  const assetUrls = [
    '/@vite/client',
    '/__vite_ping',
    '/node_modules/.vite/deps/react.js',
    '/assets/index.abc123.js',
    '/styles/main.css',
    '/favicon.ico',
    '/logo.png?v=1',
  ];

  for (const url of assetUrls) {
    it(`calls next() without serving HTML for "${url}"`, async () => {
      const plugin = htmlFallbackPlugin(indexHtmlPath);
      const middleware = getMiddleware(plugin);

      const req = { url };
      const res = { setHeader: vi.fn(), end: vi.fn() };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.end).not.toHaveBeenCalled();
    });
  }
});

// ─── Middleware: SPA routes ───────────────────────────────────────────────────

describe('htmlFallbackPlugin middleware — SPA routes', () => {
  const spaRoutes = ['/', '/guide', '/guide/getting-started', '/api/overview'];

  for (const url of spaRoutes) {
    it(`serves transformed index.html for "${url}"`, async () => {
      const plugin = htmlFallbackPlugin(indexHtmlPath);
      const middleware = getMiddleware(plugin);

      const req = { url };
      const res = { setHeader: vi.fn(), end: vi.fn() };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8',
      );
      expect(res.end).toHaveBeenCalledWith(RAW_HTML);
    });
  }
});

// ─── Middleware: missing url falls back to "/" ─────────────────────────────────

describe('htmlFallbackPlugin middleware — missing url', () => {
  it('defaults req.url to "/" and serves HTML', async () => {
    const plugin = htmlFallbackPlugin(indexHtmlPath);
    const middleware = getMiddleware(plugin);

    const req = {}; // no url property
    const res = { setHeader: vi.fn(), end: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.end).toHaveBeenCalledWith(RAW_HTML);
  });
});

// ─── Middleware: error propagation ───────────────────────────────────────────

describe('htmlFallbackPlugin middleware — error handling', () => {
  it('calls next(error) when transformIndexHtml throws', async () => {
    const plugin = htmlFallbackPlugin('/non-existent/path/index.html');
    let capturedMiddleware: Middleware | undefined;
    const mockServer = {
      middlewares: { use: (fn: Middleware) => { capturedMiddleware = fn; } },
      transformIndexHtml: vi.fn().mockRejectedValue(new Error('transform failed')),
    };
    (plugin.configureServer as unknown as (s: typeof mockServer) => void)(mockServer);

    const req = { url: '/some-route' };
    const res = { setHeader: vi.fn(), end: vi.fn() };
    const next = vi.fn();

    // readFileSync will throw because the path doesn't exist — next should be called with the error.
    await capturedMiddleware!(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
