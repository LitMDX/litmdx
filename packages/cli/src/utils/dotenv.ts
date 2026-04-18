import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Parses a `.env` file in `cwd` and writes missing keys into `env`.
 *
 * Rules:
 *  - Lines starting with `#` and empty lines are ignored.
 *  - Values wrapped in single or double quotes are unquoted.
 *  - A key already present in `env` is never overwritten.
 *
 * @param cwd   Directory that may contain a `.env` file.
 * @param env   Target env object (defaults to `process.env`).
 */
export function loadDotenv(
  cwd: string,
  env: Record<string, string | undefined> = process.env,
): void {
  const envFile = join(cwd, '.env');
  if (!existsSync(envFile)) return;

  const lines = readFileSync(envFile, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const value = line
      .slice(eqIdx + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');

    if (!(key in env)) {
      env[key] = value;
    }
  }
}
