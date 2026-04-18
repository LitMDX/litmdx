// SPA fallback plugin: serves index.html for all requests that are not assets
// (JS, CSS, images, etc.).
//
// Required because Vite is designed to run from the project directory with a
// static vite.config.ts. When using createServer() programmatically with a
// generated root (.litmdx/), the built-in SPA handling is not reliably activated.
// This pre-middleware (configureServer WITHOUT a return) intercepts route requests
// like /guide before Vite's 404 handler rejects them.

import { readFileSync } from 'fs';
import type { ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer, Connect } from 'vite';

export function htmlFallbackPlugin(indexHtmlPath: string, bypassPrefixes: string[] = []): Plugin {
  return {
    name: 'litmdx:html-fallback',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const url: string = req.url || '/';

          const isAsset =
            url.startsWith('/@') ||
            url.startsWith('/__') ||
            url.includes('node_modules') ||
            /\.[a-zA-Z0-9]{1,8}(\?.*)?$/.test(url);
          if (isAsset) return next();

          if (bypassPrefixes.some((prefix) => url.startsWith(prefix))) return next();

          try {
            const raw = readFileSync(indexHtmlPath, 'utf8');
            const html = await server.transformIndexHtml(url, raw);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          } catch (e) {
            next(e as Error);
          }
        },
      );
    },
  };
}
