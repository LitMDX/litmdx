import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import AFTER any mocks (none needed here — loadUserConfig has no heavy deps).
const { loadUserConfig } = await import('../../src/vite/user-config.js');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpBase = join(tmpdir(), `litmdx-user-config-test-${Date.now()}`);

beforeAll(() => mkdirSync(tmpBase, { recursive: true }));
afterAll(() => rmSync(tmpBase, { recursive: true, force: true }));

function makeRoot(subdir: string) {
  const dir = join(tmpBase, subdir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── loadUserConfig ───────────────────────────────────────────────────────────

describe('loadUserConfig', () => {
  it('returns an empty object when litmdx.config.ts does not exist', async () => {
    const root = makeRoot('no-config');
    const result = await loadUserConfig(root);
    expect(result).toEqual({});
  });

  it('returns the exported default object from litmdx.config.ts', async () => {
    // Each test that writes a config.ts needs its own dir to avoid module cache collisions.
    const root = join(tmpdir(), `litmdx-usc-basic-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'litmdx.config.ts'), `export default { title: 'My Site' };\n`);

    const result = await loadUserConfig(root);
    expect(result).toMatchObject({ title: 'My Site' });

    rmSync(root, { recursive: true, force: true });
  });

  it('returns all fields from litmdx.config.ts', async () => {
    const root = join(tmpdir(), `litmdx-usc-full-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'litmdx.config.ts'),
      `export default { title: 'Docs', description: 'A great site', baseUrl: '/docs/' };\n`,
    );

    const result = await loadUserConfig(root);
    expect(result).toMatchObject({
      title: 'Docs',
      description: 'A great site',
      baseUrl: '/docs/',
    });

    rmSync(root, { recursive: true, force: true });
  });

  it('returns an empty object when litmdx.config.ts exports an empty object', async () => {
    const root = join(tmpdir(), `litmdx-usc-empty-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'litmdx.config.ts'), `export default {};\n`);

    const result = await loadUserConfig(root);
    expect(result).toEqual({});

    rmSync(root, { recursive: true, force: true });
  });
});
