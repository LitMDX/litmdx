import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePackageJson, generateConfig, generateIndexMdx, generateTsConfig } from '../src/index.js';

// ─── Module-level mocks (vi.mock is hoisted, must be at top level) ──────────

const { mockExistsSync, mockMkdirSync, mockWriteFileSync, mockCopyFileSync, mockPrompts } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockCopyFileSync: vi.fn(),
  mockPrompts: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
    copyFileSync: mockCopyFileSync,
  };
});

vi.mock('prompts', () => ({ default: mockPrompts }));

describe('generatePackageJson', () => {
  it('produces valid JSON', () => {
    expect(() => JSON.parse(generatePackageJson('my-docs'))).not.toThrow();
  });

  it('sets name to the provided project name', () => {
    const pkg = JSON.parse(generatePackageJson('my-docs'));
    expect(pkg.name).toBe('my-docs');
  });

  it('is private', () => {
    const pkg = JSON.parse(generatePackageJson('my-docs'));
    expect(pkg.private).toBe(true);
  });

  it('has dev and build scripts', () => {
    const pkg = JSON.parse(generatePackageJson('my-docs'));
    expect(pkg.scripts.dev).toBe('litmdx dev');
    expect(pkg.scripts.build).toBe('litmdx build');
  });

  it('declares litmdx, react and react-dom as dependencies', () => {
    const pkg = JSON.parse(generatePackageJson('my-docs'));
    expect(pkg.dependencies).toMatchObject({
      litmdx: 'latest',
      react: expect.any(String),
      'react-dom': expect.any(String),
    });
  });

  it('uses "module" type', () => {
    const pkg = JSON.parse(generatePackageJson('my-docs'));
    expect(pkg.type).toBe('module');
  });

  it('interpolates a custom project name correctly', () => {
    const pkg = JSON.parse(generatePackageJson('custom-name'));
    expect(pkg.name).toBe('custom-name');
  });
});

// ─── generateConfig ─────────────────────────────────────────────────────────

describe('generateConfig', () => {
  it('uses defineConfig from @litmdx/core', () => {
    expect(generateConfig('my-docs')).toContain("from '@litmdx/core'");
    expect(generateConfig('my-docs')).toContain('defineConfig');
  });

  it('sets title to the provided project name', () => {
    expect(generateConfig('my-docs')).toContain("title: 'my-docs'");
  });

  it('sets webmcp to false', () => {
    expect(generateConfig('my-docs')).toContain('webmcp: false');
  });

  it('includes a description field', () => {
    expect(generateConfig('my-docs')).toContain('description:');
  });

  it('includes themed logo and favicon examples', () => {
    const cfg = generateConfig('my-docs');
    expect(cfg).toContain("logo: {");
    expect(cfg).toContain("light: '/logo-light.svg'");
    expect(cfg).toContain("dark: '/logo-dark.svg'");
    expect(cfg).toContain("favicon: {");
    expect(cfg).toContain("light: '/favicon-light.svg'");
    expect(cfg).toContain("dark: '/favicon-dark.svg'");
  });

  it('includes both internal and external nav examples', () => {
    const cfg = generateConfig('my-docs');
    expect(cfg).toContain("to: '/guides/getting-started'");
    expect(cfg).toContain("href: 'https://github.com/LitMDX/litmdx'");
  });

  it('interpolates a custom project name in title', () => {
    expect(generateConfig('custom-name')).toContain("title: 'custom-name'");
  });
});

// ─── generateIndexMdx ───────────────────────────────────────────────────────

describe('generateIndexMdx', () => {
  it('has YAML frontmatter with title', () => {
    const content = generateIndexMdx();
    expect(content).toMatch(/^---/);
    expect(content).toContain('title:');
  });

  it('has YAML frontmatter with description', () => {
    expect(generateIndexMdx()).toContain('description:');
  });

  it('has an h1 heading', () => {
    expect(generateIndexMdx()).toMatch(/^# .+/m);
  });
});

// ─── generateTsConfig ───────────────────────────────────────────────────────

describe('generateTsConfig', () => {
  it('produces valid JSON', () => {
    expect(() => JSON.parse(generateTsConfig())).not.toThrow();
  });

  it('uses ESNext module and Bundler moduleResolution', () => {
    const tsconfig = JSON.parse(generateTsConfig());
    expect(tsconfig.compilerOptions.module).toBe('ESNext');
    expect(tsconfig.compilerOptions.moduleResolution).toBe('Bundler');
  });

  it('enables JSX with react-jsx transform', () => {
    const tsconfig = JSON.parse(generateTsConfig());
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
  });

  it('includes react and react-dom in types', () => {
    const tsconfig = JSON.parse(generateTsConfig());
    expect(tsconfig.compilerOptions.types).toContain('react');
    expect(tsconfig.compilerOptions.types).toContain('react-dom');
  });

  it('includes litmdx.config.ts in the include list', () => {
    const tsconfig = JSON.parse(generateTsConfig());
    expect(tsconfig.include).toContain('litmdx.config.ts');
  });
});

// ─── createProject ──────────────────────────────────────────────────────────

describe('createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates project directory and writes expected files', async () => {
    mockPrompts.mockResolvedValue({ projectName: 'test-project', directory: 'test-project' });
    mockExistsSync.mockReturnValue(false);

    const { createProject } = await import('../src/index.js');
    await createProject();

    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalledTimes(6);

    const writtenPaths = mockWriteFileSync.mock.calls.map((call) => String(call[0]));
    expect(writtenPaths.some((p) => p.endsWith('package.json'))).toBe(true);
    expect(writtenPaths.some((p) => p.endsWith('tsconfig.json'))).toBe(true);
    expect(writtenPaths.some((p) => p.endsWith('litmdx.config.ts'))).toBe(true);
    expect(writtenPaths.some((p) => p.endsWith('index.mdx'))).toBe(true);
    expect(writtenPaths.some((p) => p.endsWith('guides/getting-started.mdx'))).toBe(true);
    expect(writtenPaths.some((p) => p.endsWith('components/button.mdx'))).toBe(true);

    const copiedDests = mockCopyFileSync.mock.calls.map((call) => String(call[1]));
    expect(copiedDests.some((p) => p.endsWith('public/logo-light.svg'))).toBe(true);
    expect(copiedDests.some((p) => p.endsWith('public/logo-dark.svg'))).toBe(true);
  });

  it('writes package.json with correct project name', async () => {
    mockPrompts.mockResolvedValue({ projectName: 'hello-world', directory: 'hello-world' });
    mockExistsSync.mockReturnValue(false);

    const { createProject } = await import('../src/index.js');
    await createProject();

    const pkgCall = mockWriteFileSync.mock.calls.find((call) => String(call[0]).endsWith('package.json'));
    expect(pkgCall).toBeDefined();
    const parsed = JSON.parse(pkgCall![1] as string);
    expect(parsed.name).toBe('hello-world');
  });

  it('exits with code 1 when target directory already exists', async () => {
    mockPrompts.mockResolvedValue({ projectName: 'existing', directory: 'existing' });
    mockExistsSync.mockReturnValue(true);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: string | number | null) => {
      throw new Error('process.exit called');
    });

    const { createProject } = await import('../src/index.js');
    await expect(createProject()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockMkdirSync).not.toHaveBeenCalled();
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('uses project name as directory when directory input is empty', async () => {
    mockPrompts.mockResolvedValue({ projectName: 'auto-dir', directory: '' });
    mockExistsSync.mockReturnValue(false);

    const { createProject } = await import('../src/index.js');
    await createProject();

    const mkdirCalls = mockMkdirSync.mock.calls.map((call) => String(call[0]));
    expect(mkdirCalls.some((p) => p.endsWith('auto-dir'))).toBe(true);
  });
});
