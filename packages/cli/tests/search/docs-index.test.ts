/**
 * Integration tests for buildDocsIndex (file I/O behaviour).
 *
 * These tests exercise the end-to-end pipeline:
 *   walkMdx → parseMdxSource → resolveDocRoute → writeFileSync
 *
 * Content parsing logic is tested in isolation in tests/search/mdx-parser.test.ts.
 * Route resolution logic is tested in isolation in tests/search/route-resolver.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDocsIndex } from '../../src/search/docs-index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let root: string;
let docsDir: string;
let outDir: string;

function mkdoc(relPath: string, content: string): void {
  const full = join(docsDir, relPath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function readIndex(): Array<{
  path: string;
  title: string;
  description: string;
  content: string;
  raw: string;
}> {
  return JSON.parse(readFileSync(join(outDir, 'docs-index.json'), 'utf-8'));
}

beforeEach(() => {
  root = join(tmpdir(), `litmdx-docs-index-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  docsDir = join(root, 'docs');
  outDir = join(root, 'dist');
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// File output
// ---------------------------------------------------------------------------

describe('buildDocsIndex — file output', () => {
  it('writes docs-index.json with one entry per MDX file', () => {
    mkdoc('index.mdx', '# Home\n\nWelcome.');
    mkdoc('guide.mdx', '# Guide\n\nContent.');

    buildDocsIndex(docsDir, outDir);

    const entries = readIndex();
    expect(entries).toHaveLength(2);
  });

  it('does nothing when docsDir has no MDX files', () => {
    buildDocsIndex(docsDir, outDir);
    expect(() => readFileSync(join(outDir, 'docs-index.json'))).toThrow();
  });

  it('does nothing when docsDir does not exist', () => {
    buildDocsIndex(join(root, 'nonexistent'), outDir);
    expect(() => readFileSync(join(outDir, 'docs-index.json'))).toThrow();
  });

  it('preserves raw source in the raw field', () => {
    const source = '---\ntitle: Raw Test\n---\n\n# Raw Test\n\nBody.';
    mkdoc('page.mdx', source);

    buildDocsIndex(docsDir, outDir);

    const [entry] = readIndex();
    expect(entry.raw).toBe(source);
  });

  it('each entry has path, title, description, content, and raw fields', () => {
    mkdoc('page.mdx', '---\ntitle: My Page\ndescription: Summary.\n---\n\nBody.');

    buildDocsIndex(docsDir, outDir);

    const [entry] = readIndex();
    expect(entry).toHaveProperty('path');
    expect(entry).toHaveProperty('title');
    expect(entry).toHaveProperty('description');
    expect(entry).toHaveProperty('content');
    expect(entry).toHaveProperty('raw');
  });
});

// ---------------------------------------------------------------------------
// Route assignment (smoke tests — full coverage in route-resolver.test.ts)
// ---------------------------------------------------------------------------

describe('buildDocsIndex — route assignment', () => {
  it('assigns / to index.mdx', () => {
    mkdoc('index.mdx', '# Home\n\nContent.');

    buildDocsIndex(docsDir, outDir);

    const [entry] = readIndex();
    expect(entry.path).toBe('/');
  });

  it('assigns /guide to guide.mdx', () => {
    mkdoc('guide.mdx', '# Guide\n\nContent.');

    buildDocsIndex(docsDir, outDir);

    const [entry] = readIndex();
    expect(entry.path).toBe('/guide');
  });

  it('rewrites home/ prefix so no path starts with /home', () => {
    mkdoc('home/index.mdx', '# Home Root\n\nContent.');
    mkdoc('home/basics/getting-started.mdx', '# Getting Started\n\nContent.');

    buildDocsIndex(docsDir, outDir);

    const paths = readIndex().map((e) => e.path);
    expect(paths.every((p) => !p.startsWith('/home'))).toBe(true);
  });

  it('includes all section directories (not just home)', () => {
    mkdoc('home/index.mdx', '# Home\n\nContent.');
    mkdoc('reference/cli.mdx', '# CLI\n\nContent.');
    mkdoc('guide/intro.mdx', '# Intro\n\nContent.');

    buildDocsIndex(docsDir, outDir);

    const paths = readIndex().map((e) => e.path);
    expect(paths).toContain('/reference/cli');
    expect(paths).toContain('/guide/intro');
  });
});
