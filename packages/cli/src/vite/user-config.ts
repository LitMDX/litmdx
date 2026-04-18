import path from 'path';
import { existsSync } from 'fs';
import { loadConfigFromFile } from 'vite';

/**
 * Loads `litmdx.config.ts` from the project root using Vite's built-in
 * config loader. Returns an empty object when the file is absent.
 *
 * Responsibility (single): read the user's project configuration file.
 * Merging, validation, and defaults are handled by `@litmdx/core/config`.
 */
export async function loadUserConfig(root: string): Promise<Record<string, unknown>> {
  const configPath = path.join(root, 'litmdx.config.ts');
  if (!existsSync(configPath)) return {};
  const result = await loadConfigFromFile(
    { command: 'build', mode: 'production' },
    configPath,
    root,
  );
  return (result?.config as Record<string, unknown>) ?? {};
}
