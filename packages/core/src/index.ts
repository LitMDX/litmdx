import type { UserConfig } from './config.js';

export type { UserConfig as LitMDXConfig };

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export { createVitePlugin } from './vite-plugin.js';
export { resolveConfig } from './config.js';
export { resolveRoutes } from './router.js';
