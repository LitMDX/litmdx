import { describe, it, expect, vi } from 'vitest';
import { docsIndexMiddlewarePlugin } from '../../../src/vite/plugins/docs-index-middleware.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UseHandler = (path: string, fn: (req: unknown, res: MockRes) => void) => void;

interface MockRes {
  setHeader: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
}

function captureMiddleware(
  docsDir: string,
  agentIndexer?: Record<string, unknown>,
): {
  middleware: null | ((req: unknown, res: MockRes) => void);
  triggerConfigure: () => Promise<void>;
} {
  const captured: { path: string; fn: (req: unknown, res: MockRes) => void } | null = null;
  let capturedFn: ((req: unknown, res: MockRes) => void) | null = null;

  vi.doMock('@litmdx/agent/indexer', () => agentIndexer ?? { buildIndex: () => new Map() });

  const plugin = docsIndexMiddlewarePlugin(docsDir);

  const mockServer = {
    middlewares: {
      use: ((path: string, fn: (req: unknown, res: MockRes) => void) => {
        if (path === '/docs-index.json') capturedFn = fn;
      }) as UseHandler,
    },
  };

  return {
    get middleware() {
      return capturedFn;
    },
    triggerConfigure: async () => {
      await (plugin.configureServer as unknown as (s: typeof mockServer) => Promise<void>)(mockServer);
    },
  };
}

// ─── Plugin shape ─────────────────────────────────────────────────────────────

describe('docsIndexMiddlewarePlugin — shape', () => {
  it('returns a plugin with name "litmdx:docs-index"', () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    expect(plugin.name).toBe('litmdx:docs-index');
  });

  it('applies only during serve', () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    expect(plugin.apply).toBe('serve');
  });

  it('defines a configureServer hook', () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    expect(typeof plugin.configureServer).toBe('function');
  });
});

// ─── configureServer: middleware registration ──────────────────────────────────

describe('docsIndexMiddlewarePlugin — configureServer', () => {
  it('registers a middleware for exactly /docs-index.json', async () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    const registeredPaths: string[] = [];

    const mockServer = {
      middlewares: {
        use: (path: string, _fn: unknown) => {
          registeredPaths.push(path);
        },
      },
    };
    vi.doMock('@litmdx/agent/indexer', () => ({ buildIndex: () => new Map() }));

    await (plugin.configureServer as (s: typeof mockServer) => Promise<void>)(mockServer);

    expect(registeredPaths).toContain('/docs-index.json');
    expect(registeredPaths).toHaveLength(1);
  });

  it('registers the middleware even when @litmdx/agent/indexer import fails', async () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    const registeredPaths: string[] = [];

    const mockServer = {
      middlewares: {
        use: (path: string, _fn: unknown) => {
          registeredPaths.push(path);
        },
      },
    };

    vi.doMock('@litmdx/agent/indexer', () => {
      throw new Error('module not found');
    });

    await (plugin.configureServer as (s: typeof mockServer) => Promise<void>)(mockServer);

    // Middleware must always be registered regardless of the import failure.
    expect(registeredPaths).toContain('/docs-index.json');
  });
});

// ─── Middleware handler: response headers ─────────────────────────────────────

describe('docsIndexMiddlewarePlugin — middleware response', () => {
  it('sets Content-Type to application/json', async () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    let handlerFn: ((req: unknown, res: MockRes) => void) | undefined;

    const mockServer = {
      middlewares: {
        use: (_path: string, fn: (req: unknown, res: MockRes) => void) => {
          handlerFn = fn;
        },
      },
    };
    vi.doMock('@litmdx/agent/indexer', () => ({ buildIndex: () => new Map() }));
    await (plugin.configureServer as unknown as (s: typeof mockServer) => Promise<void>)(mockServer);

    const res: MockRes = { setHeader: vi.fn(), end: vi.fn() };
    handlerFn!({}, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
  });

  it('calls res.end with a JSON string', async () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    let handlerFn: ((req: unknown, res: MockRes) => void) | undefined;

    const mockServer = {
      middlewares: {
        use: (_path: string, fn: (req: unknown, res: MockRes) => void) => {
          handlerFn = fn;
        },
      },
    };
    vi.doMock('@litmdx/agent/indexer', () => ({ buildIndex: () => new Map() }));
    await (plugin.configureServer as unknown as (s: typeof mockServer) => Promise<void>)(mockServer);

    const res: MockRes = { setHeader: vi.fn(), end: vi.fn() };
    handlerFn!({}, res);

    const body = res.end.mock.calls[0][0] as string;
    expect(() => JSON.parse(body)).not.toThrow();
  });

  it('responds with "[]" when @litmdx/agent/indexer fails to import', async () => {
    const plugin = docsIndexMiddlewarePlugin('/some/docs');
    let handlerFn: ((req: unknown, res: MockRes) => void) | undefined;

    const mockServer = {
      middlewares: {
        use: (_path: string, fn: (req: unknown, res: MockRes) => void) => {
          handlerFn = fn;
        },
      },
    };
    vi.doMock('@litmdx/agent/indexer', () => {
      throw new Error('not installed');
    });
    await (plugin.configureServer as unknown as (s: typeof mockServer) => Promise<void>)(mockServer);

    const res: MockRes = { setHeader: vi.fn(), end: vi.fn() };
    handlerFn!({}, res);

    expect(res.end.mock.calls[0][0]).toBe('[]');
  });
});
