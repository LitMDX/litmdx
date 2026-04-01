import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/vite/prepare/index.js', () => ({
  writeGeneratedUserComponents: vi.fn(),
}));

import { userComponentsWatcherPlugin } from '../../../src/vite/plugins/user-components-watcher.js';
import { writeGeneratedUserComponents } from '../../../src/vite/prepare/index.js';

const ROOT_DIR = '/fake/project';
const LITMDX_DIR = '/fake/project/.litmdx';
const APP_TSX = `${LITMDX_DIR}/app.tsx`;
const USER_COMPONENTS_TS = `${ROOT_DIR}/src/components/index.ts`;
const USER_COMPONENTS_TSX = `${ROOT_DIR}/src/components/index.tsx`;
const USER_COMPONENTS_JS = `${ROOT_DIR}/src/components/index.js`;
const USER_COMPONENTS_JSX = `${ROOT_DIR}/src/components/index.jsx`;

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
    _invalidate: mockInvalidate,
    _wsSend: mockWsSend,
  };
}

describe('userComponentsWatcherPlugin', () => {
  it('returns a plugin with the correct name', () => {
    const plugin = userComponentsWatcherPlugin(ROOT_DIR, LITMDX_DIR);
    expect(plugin.name).toBe('litmdx:user-components-watcher');
  });

  it('defines a configureServer hook', () => {
    const plugin = userComponentsWatcherPlugin(ROOT_DIR, LITMDX_DIR);
    expect(typeof plugin.configureServer).toBe('function');
  });
});

describe('userComponentsWatcherPlugin — configureServer', () => {
  it('adds all supported user components entry file candidates to the watcher', () => {
    const plugin = userComponentsWatcherPlugin(ROOT_DIR, LITMDX_DIR);
    const server = makeMockServer();
    (plugin.configureServer as unknown as (s: typeof server) => void)(server);

    expect(server.watcher.add).toHaveBeenCalledWith([
      USER_COMPONENTS_TSX,
      USER_COMPONENTS_TS,
      USER_COMPONENTS_JSX,
      USER_COMPONENTS_JS,
    ]);
  });

  it('registers listeners for add/change/unlink', () => {
    const plugin = userComponentsWatcherPlugin(ROOT_DIR, LITMDX_DIR);
    const server = makeMockServer();
    (plugin.configureServer as unknown as (s: typeof server) => void)(server);

    const events = server.watcher.on.mock.calls.map(([ev]: [string, ...unknown[]]) => ev);
    expect(events).toContain('add');
    expect(events).toContain('change');
    expect(events).toContain('unlink');
  });
});

describe('userComponentsWatcherPlugin — watched file changes', () => {
  let server: ReturnType<typeof makeMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    const plugin = userComponentsWatcherPlugin(ROOT_DIR, LITMDX_DIR);
    server = makeMockServer();
    (plugin.configureServer as unknown as (s: typeof server) => void)(server);
  });

  it('regenerates bridge and reloads when src/components/index.ts changes', () => {
    server.watcher.emit('change', USER_COMPONENTS_TS);

    expect(writeGeneratedUserComponents).toHaveBeenCalledWith(LITMDX_DIR, ROOT_DIR);
    expect(server.moduleGraph.getModulesByFile).toHaveBeenCalledWith(APP_TSX);
    expect(server._invalidate).toHaveBeenCalled();
    expect(server._wsSend).toHaveBeenCalledWith({ type: 'full-reload' });
  });

  it('handles add and unlink for supported files', () => {
    server.watcher.emit('add', USER_COMPONENTS_TSX);
    server.watcher.emit('unlink', USER_COMPONENTS_JSX);

    expect(writeGeneratedUserComponents).toHaveBeenCalledTimes(2);
    expect(server._wsSend).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated files', () => {
    server.watcher.emit('change', `${ROOT_DIR}/docs/index.mdx`);
    expect(writeGeneratedUserComponents).not.toHaveBeenCalled();
    expect(server._wsSend).not.toHaveBeenCalled();
  });
});
