import path from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import type { ResolvedConfig } from '@litmdx/core/config';
import { resolveUserComponentsEntry, toImportPath } from './fs.js';

// ─── Built-in opt-in components ───────────────────────────────────────────────
//
// This function generates `.litmdx/src/generated/built-in-components.ts`, which
// exports the `builtInComponents` map. That map is merged into the global MDX
// component registry in `template/src/components/index.ts`.
//
// HOW TO ADD A NEW OPT-IN COMPONENT
// ──────────────────────────────────
// 1. Create the component file in `packages/cli/template/src/components/`.
//    - Keep it a pure React component; no top-level side effects.
//    - Use a dynamic `import('heavy-dep')` inside the component for the heavy
//      library so it stays in a separate lazy chunk.
//
// 2. Add a flag to `ComponentsConfig` in `packages/core/src/config.ts`:
//      myFeature?: boolean; // default: false
//
// 3. Add it to `resolveConfig` in the same file:
//      components: { mermaid: user.components?.mermaid ?? false,
//                    myFeature: user.components?.myFeature ?? false }
//
// 4. Register it here below, following the same `if (config.components.myFeature)`
//    pattern used for Mermaid.
//
// 5. If the heavy library produces many chunks, add a `manualChunks` entry in
//    `packages/cli/src/vite/config.ts` (see the existing Mermaid block).
//
// 6. Update the cost table in the `ComponentsConfig` JSDoc in config.ts.
//
// 7. Update the opt-in components table in `docs/home/features/components.mdx`.
//
// 8. Add tests in `packages/cli/tests/vite/prepare.test.ts` (see existing
//    `writeGeneratedBuiltInComponents` describe block for the pattern).
// ─────────────────────────────────────────────────────────────────────────────

export function writeGeneratedBuiltInComponents(litmdxDir: string, config: ResolvedConfig): string {
  const generatedDir = path.join(litmdxDir, 'src', 'generated');
  const outputPath = path.join(generatedDir, 'built-in-components.ts');

  const lines: string[] = ['// Auto-generated — do not edit.'];
  const registered: string[] = [];

  if (config.components.mermaid) {
    lines.push("import { Mermaid } from '../components/Mermaid';");
    registered.push('Mermaid');
  }

  lines.push(
    registered.length === 0
      ? 'export const builtInComponents = {} as const;'
      : `export const builtInComponents = { ${registered.join(', ')} } as const;`,
  );

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(outputPath, lines.join('\n') + '\n');

  return outputPath;
}

export function writeGeneratedUserComponents(
  litmdxDir: string,
  rootDir: string = process.cwd(),
): string {
  const generatedDir = path.join(litmdxDir, 'src', 'generated');
  const outputPath = path.join(generatedDir, 'user-components.ts');
  const userComponentsEntry = resolveUserComponentsEntry(rootDir);

  const lines: string[] = ['// Auto-generated — do not edit.'];

  if (!userComponentsEntry) {
    lines.push('export const userComponents = {} as const;');
  } else {
    const importPath = toImportPath(generatedDir, userComponentsEntry);
    lines.push(`import * as UserComponentsModule from '${importPath}';`);
    lines.push('type UserComponentsModuleShape = {');
    lines.push('  mdxComponents?: unknown;');
    lines.push('  default?: unknown;');
    lines.push('};');
    lines.push('type UserComponentMap = Record<string, unknown>;');
    lines.push('');
    lines.push('const resolvedUserComponents =');
    lines.push('  (UserComponentsModule as UserComponentsModuleShape).mdxComponents ??');
    lines.push('  (UserComponentsModule as UserComponentsModuleShape).default ??');
    lines.push('  {};');
    lines.push('');
    lines.push('export const userComponents = resolvedUserComponents as UserComponentMap;');
  }

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(outputPath, lines.join('\n') + '\n');

  return outputPath;
}
