import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const _thisDir = path.dirname(fileURLToPath(import.meta.url));
// In the published package: dist/vite/prepare/config.js → ../../template = dist/template/
// Running from source (tests): src/vite/prepare/config.ts → ../../../template = package root template/
const _distTemplate = path.join(_thisDir, '../../template');
const _srcTemplate = path.join(_thisDir, '../../../template');
export const templateDir = existsSync(_distTemplate) ? _distTemplate : _srcTemplate;

// tailwindcss is a direct dependency of the CLI — createRequire finds it in
// packages/cli/node_modules/tailwindcss without relying on hoisting.
const _require = createRequire(import.meta.url);
export const tailwindcssPath = path.dirname(_require.resolve('tailwindcss/package.json'));
