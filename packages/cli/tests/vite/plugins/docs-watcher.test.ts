import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../../src/vite/page-meta.js', () => ({
  writeGeneratedPageMeta: vi.fn(),
}));

import { docsWatcherPlugin } from '../../../src/vite/plugins/docs-watcher.js';
import type { Plugin } from 'vite';
import { writeGeneratedPageMeta } from '../../../src/vite/page-meta.js';

const DOCS_DIR = '/fake/project/docs';
const LITMDX_DIR = '/fake/project/.litmdx';
const APP_TSX = `${LITMDX_DIR}/app.tsx`;

// ─── Mock ViteDevServer ───────────────────────────────────────────────────────

function makeMockServer() {
  const watcherListeners: Record<string, ((file: string) => void)[]> = {};
  const fakeWatcher = {
    add: vi.fn(),
    on: vi.fn((event: string, cb: (file: string) => void) => {
      watcherListeners[event] ??= [];
      watcherListeners[event].push(cb);
    }),
    emit(event: string, file: string) {
      watcherListeners[event]?.forEach((cb) => cb(file));
    },
  };

  const fakeModule = { id: APP_TSX };
  const mockInvalidate = vi.fn();
  const fakeModuleGraph = {
    getModulesByFile: vi.fn().mockReturnValue(new Set([fakeModule])),
    invalidateModule: mockInvalidate,
  };

  const mockWsSend = vi.fn();

  return {
    watcher: fakeWatcher,
    moduleGraph: fakeModuleGraph,
    ws: { send: mockWsSend },
    // Helpers for assertions
    _invalidate: mockInvalidate,
    _wsSend: mockWsSend,
  };
}

// ─── Plugin shape ─────────────────────────────────────────────────────────────

describe('docsWatcherPlugin', () => {
  it('returns a plugin with the correct name', () => {
    const plugin = docsWatcherPlugin(DOCS_DIR, LITMDX_DIR);
    expect(plugin.name).toBe('litmdx:docs-watcher');
  });

  it('defines a configureServer hook', () => {
    const plugin = docsWatcherPlugin(DOCS_DIR, LITMDX_DIR);
    expect(typeof plugin.configureServer).toBe('function');
  });
});

// ─── configureServer ─────────────────────────────────────────────────────────

describe('docsWatcherPlugin — configureServer', () => {
  it('adds docsDir to the file watcher', () => {
    const plugin = docsWatcherPlugin(DOCS_DIR, LITMDX_DIR);
    const server = makeMockServer();
    (plugin.configureServer as unknown as (s: typeof server) => void)(server);
    expect(server.watcher.add).toHaveBeenCalledWith(DOCS_DIR);
  });

  it('registers listeners for "add", "change" and "unlink" watcher events', () => {
    const plugin = docsWatcherPlugin(DOCS_DIR, LITMDX_DIR);
    const server = makeMockServer();
    (plugin.configureServer as unknown as (s: typeof server) => void)(server);

    const registeredEvents = server.watcher.on.mock.calls.map(([ev]: [string, ...unknown[]]) => ev);
    expect(registeredEvents).toContain('add');
    expect(registeredEvents).toContain('change');
    expect(registeredEvents).toContain('unlink');
  });
});

// ─── add / unlink .mdx files ─────────────────────────────────────────────────

describe('docsWatcherPlugin — new .mdx file added', () => {
  let server: ReturnType<typeof makeMockServer>;

  beforeEach(() => {
    const plugin = docsWatcherPlugin(DOCS_DIR, LITMDX_DIR);
    server = makeMockServer();
    (plugin.configureServer as unknown as (s: typeof server) => void)(server);
  });

  it('sends a full-reload when a .mdx file is added inside docsDir', () => {
    server.watcher.emit('add', `${DOCS_DIR}/new-page.mdx`);
    expect(server._wsSend).toHaveBeenCalledWith({ type: 'full-reload' });
  });

  it('regenerates the page metadata manifest when a .mdx file changes', () => {
    server.watcher.emit('change', `${DOCS_DIR}/new-page.mdx`);
    expect(writeGeneratedPageMeta).toHaveBeenCalledWith(LITMDX_DIR, DOCS_DIR);
  });

  it('invalidates app.tsx when a .mdx file is added', () => {
    server.watcher.emit('add', `${DOCS_DIR}/new-page.mdx`);
    expect(server.moduleGraph.getModulesByFile).toHaveBeenCalledWith(APP_TSX);
    expect(server._invalidate).toHaveBeenCalled();
  });

  it('sends a full-reload when a .mdx file is deleted', () => {
    server.watcher.emit('unlink', `${DOCS_DIR}/old-page.mdx`);
    expect(server._wsSend).toHaveBeenCalledWith({ type: 'full-reload' });
  });

  it('also handles .md files', () => {
    server.watcher.emit('add', `${DOCS_DIR}/guide.md`);
    expect(server._wsSend).toHaveBeenCalledWith({ type: 'full-reload' });
  });
});

// ─── Non-.mdx events are ignored ─────────────────────────────────────────────

describe('docsWatcherPlugin — ignored events', () => {
  let server: ReturnType<typeof makeMockServer>;

  beforeEach(() => {
    const plugin = docsWatcherPlugin(DOCS_DIR, LITMDX_DIR);
    server = makeMockServer();
    (plugin.configureServer as unknown as (s: typeof server) => void)(server);
  });

  it('ignores non-.mdx files inside docsDir', () => {
    server.watcher.emit('add', `${DOCS_DIR}/image.png`);
    expect(server._wsSend).not.toHaveBeenCalled();
  });

  it('ignores .mdx files outside docsDir', () => {
    server.watcher.emit('add', `/some/other/path/page.mdx`);
    expect(server._wsSend).not.toHaveBeenCalled();
  });
});
