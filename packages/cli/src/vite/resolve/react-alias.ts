import path from 'path';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

function resolvePackageRootFromProjectOrCli(projectRoot: string, packageName: string): string {
  try {
    const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
    return path.dirname(projectRequire.resolve(`${packageName}/package.json`));
  } catch {
    return path.dirname(_require.resolve(`${packageName}/package.json`));
  }
}

function resolveFromProjectOrCli(projectRoot: string, request: string): string {
  try {
    const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
    return projectRequire.resolve(request);
  } catch {
    return _require.resolve(request);
  }
}

export function buildReactAliases(projectRoot: string): Record<string, string> {
  return {
    // Keep package roots for bare imports so subpaths resolve correctly
    // (e.g. react/jsx-runtime must not become react/index.js/jsx-runtime).
    react: resolvePackageRootFromProjectOrCli(projectRoot, 'react'),
    'react-dom': resolvePackageRootFromProjectOrCli(projectRoot, 'react-dom'),
    'react/jsx-runtime': resolveFromProjectOrCli(projectRoot, 'react/jsx-runtime'),
    'react/jsx-dev-runtime': resolveFromProjectOrCli(projectRoot, 'react/jsx-dev-runtime'),
  };
}
