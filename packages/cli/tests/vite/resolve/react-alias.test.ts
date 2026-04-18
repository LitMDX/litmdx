import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildReactAliases } from '../../../src/vite/resolve/react-alias.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use the monorepo root as the project root — react and react-dom are
// installed there, which is the same scenario a user's workspace would have.
const monoRepoRoot = join(__dirname, '../../../../');

// ─── buildReactAliases ────────────────────────────────────────────────────────

describe('buildReactAliases', () => {
  it('returns absolute paths for all four react aliases', () => {
    const aliases = buildReactAliases(monoRepoRoot);

    expect(typeof aliases.react).toBe('string');
    expect(typeof aliases['react-dom']).toBe('string');
    expect(typeof aliases['react/jsx-runtime']).toBe('string');
    expect(typeof aliases['react/jsx-dev-runtime']).toBe('string');
  });

  it('react alias points to a directory (package root), not an entry file', () => {
    const aliases = buildReactAliases(monoRepoRoot);
    // resolvePackageRootFromProjectOrCli returns dirname of package.json,
    // which is the package directory — not react/index.js.
    expect(aliases.react).not.toMatch(/index\.js$/);
    expect(aliases.react).not.toMatch(/\/cjs\//);
  });

  it('react-dom alias points to a directory, not an entry file', () => {
    const aliases = buildReactAliases(monoRepoRoot);
    expect(aliases['react-dom']).not.toMatch(/index\.js$/);
  });

  it('react/jsx-runtime alias points to a file', () => {
    const aliases = buildReactAliases(monoRepoRoot);
    expect(aliases['react/jsx-runtime']).toMatch(/\.js$/);
  });

  it('react/jsx-dev-runtime alias points to a file', () => {
    const aliases = buildReactAliases(monoRepoRoot);
    expect(aliases['react/jsx-dev-runtime']).toMatch(/\.js$/);
  });

  it('react and react-dom resolve to different directories (not the same package)', () => {
    const aliases = buildReactAliases(monoRepoRoot);
    // Each alias must point to a different directory — they are separate packages.
    // If they pointed to the same directory it would mean react-dom is being
    // aliased to the react package root, which would break rendering.
    expect(aliases.react).not.toBe(aliases['react-dom']);
  });

  it('falls back to CLI resolution when project root has no react installed', () => {
    // Pass a root that has no node_modules — the function should fall back
    // to resolving from the CLI's own node_modules without throwing.
    const aliases = buildReactAliases('/tmp/non-existent-litmdx-project');
    expect(typeof aliases.react).toBe('string');
    expect(typeof aliases['react-dom']).toBe('string');
    expect(typeof aliases['react/jsx-runtime']).toBe('string');
    expect(typeof aliases['react/jsx-dev-runtime']).toBe('string');
  });
});
