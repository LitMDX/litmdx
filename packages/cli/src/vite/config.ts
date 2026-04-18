// Main assembler for the Vite configuration used by LitMDX.
//
// buildViteConfig() is the entry point that orchestrates all steps:
//  1. Load the user's litmdx.config.ts (if present) via loadUserConfig.
//  2. Prepare the .litmdx/ directory with the CLI template files.
//  3. Generate index.html with metadata from the resolved config.
//  4. Assemble plugins: React, MDX+Tailwind (core), virtual config, SPA fallback.
//  5. Return the Vite InlineConfig ready for createServer() or build().
//
// `configFile: false` is intentional — it prevents Vite from searching for a
// vite.config.ts in the user's project. LitMDX owns the entire Vite config.
//
// Each Vite plugin has its own file under plugins/.
// User config loading lives in user-config.ts.

import path from 'path';
import react from '@vitejs/plugin-react';
import { createVitePlugin } from '@litmdx/core/vite-plugin';
import { resolveConfig } from '@litmdx/core/config';
import type { InlineConfig } from 'vite';
import { prepareEntryFiles, generateIndexHtml } from './prepare/index.js';
import { virtualConfigPlugin, VIRTUAL_CONFIG_ID } from './plugins/virtual-config.js';
import { htmlFallbackPlugin } from './plugins/html-fallback.js';
import { docsWatcherPlugin } from './plugins/docs-watcher.js';
import { userComponentsWatcherPlugin } from './plugins/user-components-watcher.js';
import { docsIndexMiddlewarePlugin } from './plugins/docs-index-middleware.js';
import { buildReactAliases } from './resolve/react-alias.js';
import { loadUserConfig } from './user-config.js';

export async function buildViteConfig(
  root: string,
  port = 5173,
  preloadedUserConfig?: Record<string, unknown>,
): Promise<InlineConfig> {
  const userConfig = preloadedUserConfig ?? (await loadUserConfig(root));
  const config = resolveConfig(userConfig);
  const reactAliases = buildReactAliases(root);

  const litmdxDir = path.join(root, '.litmdx');
  const docsDir = path.resolve(root, config.docsDir);
  prepareEntryFiles(litmdxDir, docsDir, config, root);
  const indexHtmlPath = generateIndexHtml(litmdxDir, config);

  return {
    base: config.baseUrl,
    root: litmdxDir,
    // Vite's root is .litmdx/, so its automatic public/ lookup would point to
    // .litmdx/public/ — which doesn't exist. Explicitly point it to the user's
    // project public/ directory so static assets are served and copied to dist/.
    publicDir: path.join(root, 'public'),
    configFile: false,
    plugins: [
      react(),
      ...createVitePlugin(config.plugins),
      virtualConfigPlugin(config, root),
      htmlFallbackPlugin(indexHtmlPath, config.agent?.enabled ? ['/api/agent'] : []),
      docsWatcherPlugin(docsDir, litmdxDir),
      userComponentsWatcherPlugin(root, litmdxDir),
      ...(config.agent?.enabled ? [docsIndexMiddlewarePlugin(docsDir)] : []),
    ],
    resolve: {
      alias: {
        'litmdx:config': VIRTUAL_CONFIG_ID,
        ...reactAliases,
      },
      // Prevent duplicate React instances when multiple node_modules/ are present.
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port,
      strictPort: false,
      // Allow Vite to serve files outside the root (.litmdx/) so imports
      // from docs/ and other project paths resolve correctly.
      fs: { allow: [root, litmdxDir] },
      // In dev mode, proxy /api/agent/* → the running @litmdx/agent server.
      // This avoids CORS issues when the agent runs on a different port.
      ...(config.agent?.enabled
        ? {
            proxy: {
              '/api/agent': {
                target: config.agent.serverUrl,
                changeOrigin: true,
                rewrite: (p: string) => p.replace(/^\/api\/agent/, ''),
              },
            },
          }
        : {}),
    },
    optimizeDeps: {
      // @tailwindcss/oxide is a native binding (.node) — cannot be pre-bundled.
      // @litmdx/core contains Vite server plugins — must not be sent to the browser.
      exclude: ['@tailwindcss/oxide', 'fsevents', '@litmdx/core'],
    },
    build: {
      outDir: path.join(root, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: indexHtmlPath,
        // When Mermaid is enabled, consolidate its ~40 auto-split chunks into a
        // single lazily-loaded file. This reduces HTTP requests from ~40 to 1
        // and produces a stable cache key for the browser/CDN.
        output: config.components.mermaid
          ? {
              manualChunks(id) {
                if (
                  id.includes('/mermaid/') ||
                  id.includes('/d3-') ||
                  id.includes('/cytoscape/') ||
                  id.includes('/dagre/') ||
                  id.includes('/khroma/') ||
                  id.includes('/lodash/')
                ) {
                  return 'mermaid';
                }
              },
            }
          : undefined,
      },
    },
  };
}
