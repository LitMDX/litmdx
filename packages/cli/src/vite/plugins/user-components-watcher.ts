import path from 'path';
import type { Plugin, ViteDevServer } from 'vite';
import { writeGeneratedUserComponents } from '../prepare/index.js';

function invalidateAppModules(server: ViteDevServer, appTsxPath: string) {
  const appModules = server.moduleGraph.getModulesByFile(appTsxPath);
  if (!appModules) {
    return;
  }

  for (const mod of appModules) {
    server.moduleGraph.invalidateModule(mod);
  }
}

export function userComponentsWatcherPlugin(rootDir: string, litmdxDir: string): Plugin {
  const appTsxPath = path.join(litmdxDir, 'app.tsx');
  const watchedFiles = [
    path.join(rootDir, 'src', 'components', 'index.tsx'),
    path.join(rootDir, 'src', 'components', 'index.ts'),
    path.join(rootDir, 'src', 'components', 'index.jsx'),
    path.join(rootDir, 'src', 'components', 'index.js'),
  ].map((filePath) => path.resolve(filePath));
  const watchedFileSet = new Set(watchedFiles);

  function isWatchedUserComponentsFile(filePath: string): boolean {
    return watchedFileSet.has(path.resolve(filePath));
  }

  return {
    name: 'litmdx:user-components-watcher',
    configureServer(server) {
      // Watch known user-components entry points. If any candidate appears,
      // changes, or is removed, regenerate the bridge module and reload.
      server.watcher.add(watchedFiles);

      function onUserComponentsChange(filePath: string) {
        if (!isWatchedUserComponentsFile(filePath)) {
          return;
        }

        writeGeneratedUserComponents(litmdxDir, rootDir);
        invalidateAppModules(server, appTsxPath);
        server.ws.send({ type: 'full-reload' });
      }

      server.watcher.on('add', onUserComponentsChange);
      server.watcher.on('change', onUserComponentsChange);
      server.watcher.on('unlink', onUserComponentsChange);
    },
  };
}
