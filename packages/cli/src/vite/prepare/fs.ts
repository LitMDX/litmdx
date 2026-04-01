import path from 'path';
import { mkdirSync, copyFileSync, readdirSync, existsSync } from 'fs';

export function copyDirSync(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export function toImportPath(fromDir: string, toFile: string): string {
  const relative = path.relative(fromDir, toFile).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

export function resolveUserComponentsEntry(rootDir: string): string | undefined {
  const candidates = [
    path.join(rootDir, 'src', 'components', 'index.tsx'),
    path.join(rootDir, 'src', 'components', 'index.ts'),
    path.join(rootDir, 'src', 'components', 'index.jsx'),
    path.join(rootDir, 'src', 'components', 'index.js'),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}
