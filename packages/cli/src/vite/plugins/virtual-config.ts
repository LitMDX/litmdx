// Virtual module plugin: exposes the resolved LitMDX config to the browser
// as `import config from 'litmdx:config'`.
//
// The config is serialized to JSON at startup — the React app can read title,
// nav, etc. without importing any Node.js code on the client.
// The '\0' prefix on the resolved ID is the Vite/Rollup convention for virtual
// modules: it prevents other plugins from intercepting them.
//
// In dev mode the plugin watches litmdx.config.ts and reloads the module when
// it changes so the browser gets the updated nav/title without restarting.

import path from 'path';
import type { Plugin, ViteDevServer } from 'vite';
import type { ResolvedConfig } from '@litmdx/core/config';
import { resolveConfig } from '@litmdx/core/config';

export const VIRTUAL_CONFIG_ID = 'virtual:litmdx-config';
const RESOLVED_ID = '\0' + VIRTUAL_CONFIG_ID;

export function virtualConfigPlugin(initialConfig: ResolvedConfig, root: string): Plugin {
  let current = initialConfig;
  let server: ViteDevServer | undefined;
  const configPath = path.join(root, 'litmdx.config.ts');

  return {
    name: 'litmdx:virtual-config',
    resolveId(id: string) {
      if (id === VIRTUAL_CONFIG_ID) return RESOLVED_ID;
    },
    load(id: string) {
      if (id === RESOLVED_ID) {
        return `export default ${JSON.stringify(current)};`;
      }
    },
    configureServer(s) {
      server = s;
    },
    async handleHotUpdate({ file }) {
      if (file !== configPath) return;
      try {
        // Bust the dynamic import cache then re-resolve
        const timestamp = Date.now();
        const mod = await import(`${configPath}?t=${timestamp}`);
        current = resolveConfig(mod.default ?? {});
      } catch {
        // keep previous config if the file has a syntax error
      }
      // Invalidate the virtual module so Vite pushes a full-reload to the browser
      const virtualMod = server?.moduleGraph.getModuleById(RESOLVED_ID);
      if (virtualMod) server?.moduleGraph.invalidateModule(virtualMod);
      server?.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
