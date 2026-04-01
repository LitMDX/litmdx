import path from 'path';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import type { ResolvedConfig } from '@litmdx/core/config';
import { resolveConfig } from '@litmdx/core/config';
import { writeGeneratedPageMeta } from '../content/index.js';
import { templateDir, tailwindcssPath } from './config.js';
import { copyDirSync } from './fs.js';
import {
  writeGeneratedBuiltInComponents,
  writeGeneratedUserComponents,
} from './generated-components.js';

function buildStylesCss(rootDir: string, docsDir: string): string {
  const templateCss = readFileSync(path.join(templateDir, 'styles.css'), 'utf8');
  // Replace the relative `@import 'tailwindcss'` with an absolute path so
  // Tailwind v4 can resolve it regardless of where .litmdx/ lives.
  const withoutTailwindImport = templateCss.replace(/@import\s+["']tailwindcss["'];?\n?/, '');
  // Explicitly tell Tailwind v4 where to scan for user-authored classes.
  // @tailwindcss/vite auto-detects via the module graph, but adding @source
  // directives here ensures classes are always generated — including in build
  // mode and for files that may be discovered late in the module graph.
  const sources = [
    `@source "${rootDir}/src/**/*.{tsx,ts,jsx,js}";`,
    `@source "${docsDir}/**/*.{mdx,tsx,ts,jsx,js}";`,
  ].join('\n');
  return `@import "${tailwindcssPath}";\n${sources}\n${withoutTailwindImport}`;
}

export function prepareEntryFiles(
  litmdxDir: string,
  docsDir?: string,
  config?: ResolvedConfig,
  rootDir: string = process.cwd(),
): void {
  const resolvedConfig = config ?? resolveConfig();
  const resolvedDocsDir = docsDir ?? path.join(rootDir, 'docs');
  mkdirSync(litmdxDir, { recursive: true });
  copyFileSync(path.join(templateDir, 'app.tsx'), path.join(litmdxDir, 'app.tsx'));
  // Copy tsconfig.json so VS Code can resolve types for files inside .litmdx/.
  // The template tsconfig points typeRoots at ../node_modules/@types which
  // resolves to <project-root>/node_modules/@types — exactly where react,
  // react-dom and vite types live in a user project.
  copyFileSync(path.join(templateDir, 'tsconfig.json'), path.join(litmdxDir, 'tsconfig.json'));
  copyDirSync(path.join(templateDir, 'src'), path.join(litmdxDir, 'src'));
  copyDirSync(path.join(templateDir, 'styles'), path.join(litmdxDir, 'styles'));
  writeFileSync(path.join(litmdxDir, 'styles.css'), buildStylesCss(rootDir, resolvedDocsDir));
  writeGeneratedPageMeta(litmdxDir, resolvedDocsDir);
  writeGeneratedBuiltInComponents(litmdxDir, resolvedConfig);
  writeGeneratedUserComponents(litmdxDir, rootDir);
}
