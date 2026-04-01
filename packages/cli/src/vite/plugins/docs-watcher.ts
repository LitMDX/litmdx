// Watches the docs/ directory (which lives outside Vite's root .litmdx/) so that:
//   - Adding or deleting an .mdx file triggers a full page reload, giving the
//     browser a fresh import.meta.glob expansion that includes the new file.
//   - Existing .mdx files are already tracked via the module graph once imported,
//     so their edits go through normal Vite HMR without extra help.

import path from 'path';
import type { Plugin, ViteDevServer } from 'vite';
import { writeGeneratedPageMeta } from '../content/index.js';

export function docsWatcherPlugin(docsDir: string, litmdxDir: string): Plugin {
  const appTsxPath = path.join(litmdxDir, 'app.tsx');
  const mdxRe = /\.mdx?$/;

  function invalidateAppModules(server: ViteDevServer) {
    const appModules = server.moduleGraph.getModulesByFile(appTsxPath);
    if (!appModules) {
      return;
    }

    for (const mod of appModules) {
      server.moduleGraph.invalidateModule(mod);
    }
  }

  return {
    name: 'litmdx:docs-watcher',
    configureServer(server) {
      // Explicitly add docsDir to chokidar so metadata/bootstrap artifacts stay
      // in sync with MDX frontmatter and route structure changes.
      server.watcher.add(docsDir);

      function onMdxChange(file: string) {
        if (!file.startsWith(docsDir) || !mdxRe.test(file)) return;

        writeGeneratedPageMeta(litmdxDir, docsDir);

        // Invalidate app.tsx so Vite re-expands import.meta.glob on next request.
        invalidateAppModules(server);

        server.ws.send({ type: 'full-reload' });
      }

      server.watcher.on('add', onMdxChange);
      server.watcher.on('change', onMdxChange);
      server.watcher.on('unlink', onMdxChange);
    },
  };
}
