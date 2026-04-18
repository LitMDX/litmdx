/**
 * Direct tests for initCommand.
 *
 * These tests call initCommand() against a real temporary directory —
 * no filesystem mocks are needed, which avoids mock-leak issues.
 *
 * Behaviour already covered by run.test.ts (run — init):
 *   - creates package.json with dev/build scripts when absent
 *   - skips package.json when one already exists
 *   - creates litmdx.config.ts
 *   - creates docs/index.mdx
 *   - calls process.exit(1) when litmdx.config.ts already exists
 *
 * This file focuses on the file-system structure and content details
 * that are not verified in run.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCommand } from '../../src/commands/init.js';

let root: string;

beforeEach(() => {
  root = join(
    tmpdir(),
    `litmdx-init-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(root, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Directory structure
// ---------------------------------------------------------------------------

describe('initCommand — directory structure', () => {
  it('creates the docs/ directory', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'docs'))).toBe(true);
  });

  it('creates the docs/guides/ subdirectory', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'docs', 'guides'))).toBe(true);
  });

  it('creates the docs/components/ subdirectory', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'docs', 'components'))).toBe(true);
  });

  it('creates the public/ directory', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'public'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Generated docs files
// ---------------------------------------------------------------------------

describe('initCommand — generated docs files', () => {
  it('creates docs/guides/getting-started.mdx', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'docs', 'guides', 'getting-started.mdx'))).toBe(true);
  });

  it('creates docs/components/button.mdx', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'docs', 'components', 'button.mdx'))).toBe(true);
  });

  it('docs/index.mdx starts with a heading', async () => {
    await initCommand(root);
    const content = readFileSync(join(root, 'docs', 'index.mdx'), 'utf-8');
    expect(content).toMatch(/^#\s+/m);
  });

  it('docs/index.mdx contains frontmatter with title', async () => {
    await initCommand(root);
    const content = readFileSync(join(root, 'docs', 'index.mdx'), 'utf-8');
    expect(content).toContain('title:');
  });

  it('docs/guides/getting-started.mdx contains a heading', async () => {
    await initCommand(root);
    const content = readFileSync(
      join(root, 'docs', 'guides', 'getting-started.mdx'),
      'utf-8',
    );
    expect(content).toMatch(/^#\s+/m);
  });

  it('docs/components/button.mdx contains a heading', async () => {
    await initCommand(root);
    const content = readFileSync(
      join(root, 'docs', 'components', 'button.mdx'),
      'utf-8',
    );
    expect(content).toMatch(/^#\s+/m);
  });
});

// ---------------------------------------------------------------------------
// litmdx.config.ts content
// ---------------------------------------------------------------------------

describe('initCommand — litmdx.config.ts content', () => {
  it('uses defineConfig', async () => {
    await initCommand(root);
    const content = readFileSync(join(root, 'litmdx.config.ts'), 'utf-8');
    expect(content).toContain('defineConfig');
  });

  it("imports from '@litmdx/core'", async () => {
    await initCommand(root);
    const content = readFileSync(join(root, 'litmdx.config.ts'), 'utf-8');
    expect(content).toContain("'@litmdx/core'");
  });

  it('includes a title field', async () => {
    await initCommand(root);
    const content = readFileSync(join(root, 'litmdx.config.ts'), 'utf-8');
    expect(content).toContain('title:');
  });

  it('includes a nav array', async () => {
    await initCommand(root);
    const content = readFileSync(join(root, 'litmdx.config.ts'), 'utf-8');
    expect(content).toContain('nav:');
  });
});

// ---------------------------------------------------------------------------
// Logo files (copied from template/public)
// ---------------------------------------------------------------------------

describe('initCommand — logo files', () => {
  it('copies logo-light.png into public/', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'public', 'logo-light.png'))).toBe(true);
  });

  it('copies logo-dark.png into public/', async () => {
    await initCommand(root);
    expect(existsSync(join(root, 'public', 'logo-dark.png'))).toBe(true);
  });

  it('logo files are non-empty', async () => {
    await initCommand(root);
    const light = readFileSync(join(root, 'public', 'logo-light.png'));
    const dark = readFileSync(join(root, 'public', 'logo-dark.png'));
    expect(light.length).toBeGreaterThan(0);
    expect(dark.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

describe('initCommand — package.json', () => {
  it('includes the dev script', async () => {
    await initCommand(root);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.scripts?.dev).toBe('litmdx dev');
  });

  it('includes the build script', async () => {
    await initCommand(root);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.scripts?.build).toBe('litmdx build');
  });

  it('sets "type": "module"', async () => {
    await initCommand(root);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.type).toBe('module');
  });

  it('does not overwrite an existing package.json', async () => {
    const existing = JSON.stringify({ name: 'my-existing-project' });
    writeFileSync(join(root, 'package.json'), existing);

    await initCommand(root);

    expect(readFileSync(join(root, 'package.json'), 'utf-8')).toBe(existing);
  });
});

// ---------------------------------------------------------------------------
// Abort path
// ---------------------------------------------------------------------------

describe('initCommand — abort when config exists', () => {
  it('calls process.exit(1) when litmdx.config.ts is already present', async () => {
    writeFileSync(join(root, 'litmdx.config.ts'), '');

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('process.exit');
      });

    await expect(initCommand(root)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does not create any new files when aborting', async () => {
    writeFileSync(join(root, 'litmdx.config.ts'), '// existing');

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('process.exit');
      });

    try {
      await initCommand(root);
    } catch {
      // expected
    }

    exitSpy.mockRestore();
    // docs/ should not have been created
    expect(existsSync(join(root, 'docs'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------

describe('initCommand — console output', () => {
  it('logs a success message', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await initCommand(root);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('litmdx project initialized'),
    );
  });

  it('logs the files that were created', async () => {
    const output: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => output.push(args.join(' ')));

    await initCommand(root);

    const joined = output.join('\n');
    expect(joined).toContain('litmdx.config.ts');
    expect(joined).toContain('docs/index.mdx');
  });
});
