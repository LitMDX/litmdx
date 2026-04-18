import type { Plugin } from 'vite';

/**
 * Serves `/docs-index.json` as a Vite middleware so that standalone agent
 * servers can point `docsIndexUrl` at the local Vite dev server instead of
 * needing a production build or access to the docs directory.
 *
 * Only active during `vite serve` (`apply: 'serve'`).
 */
export function docsIndexMiddlewarePlugin(docsDir: string): Plugin {
  return {
    name: 'litmdx:docs-index',
    apply: 'serve',
    async configureServer(server) {
      let json = '[]';
      try {
        const { buildIndex } = await import('@litmdx/agent/indexer');
        const index = buildIndex(docsDir);
        json = JSON.stringify([...index.values()]);
      } catch (err) {
        console.warn(
          `\n  ⚠  litmdx: /docs-index.json will be empty — @litmdx/agent import failed.\n` +
            `     Run 'pnpm install' in the litmdx workspace to refresh the package store.\n` +
            `     Error: ${(err as Error).message}\n`,
        );
      }
      // Always register the middleware so Vite never falls back to SPA HTML for this path.
      server.middlewares.use('/docs-index.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(json);
      });
    },
  };
}
