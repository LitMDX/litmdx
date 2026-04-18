import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDotenv } from '../../src/utils/dotenv.js';

let dir: string;

beforeEach(() => {
  dir = join(tmpdir(), `litmdx-dotenv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeEnv(content: string): void {
  writeFileSync(join(dir, '.env'), content, 'utf-8');
}

// ---------------------------------------------------------------------------
// No .env file
// ---------------------------------------------------------------------------

describe('loadDotenv — no .env file', () => {
  it('does nothing when .env is absent', () => {
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Basic parsing
// ---------------------------------------------------------------------------

describe('loadDotenv — basic parsing', () => {
  it('reads a simple KEY=value pair', () => {
    writeEnv('FOO=bar\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['FOO']).toBe('bar');
  });

  it('reads multiple keys', () => {
    writeEnv('A=1\nB=2\nC=3\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env).toMatchObject({ A: '1', B: '2', C: '3' });
  });

  it('handles values with = inside them', () => {
    writeEnv('URL=http://example.com?a=1&b=2\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['URL']).toBe('http://example.com?a=1&b=2');
  });
});

// ---------------------------------------------------------------------------
// Whitespace & blank lines
// ---------------------------------------------------------------------------

describe('loadDotenv — whitespace', () => {
  it('trims whitespace around keys and values', () => {
    writeEnv('  KEY  =  value  \n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['KEY']).toBe('value');
  });

  it('skips blank lines', () => {
    writeEnv('\nFOO=bar\n\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(Object.keys(env)).toEqual(['FOO']);
  });

  it('skips lines that are only whitespace', () => {
    writeEnv('   \nFOO=bar\n   \n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(Object.keys(env)).toEqual(['FOO']);
  });
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

describe('loadDotenv — comments', () => {
  it('ignores lines starting with #', () => {
    writeEnv('# This is a comment\nFOO=bar\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env).toEqual({ FOO: 'bar' });
  });

  it('ignores lines where # comes after leading whitespace', () => {
    writeEnv('  # indented comment\nFOO=bar\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env).toEqual({ FOO: 'bar' });
  });
});

// ---------------------------------------------------------------------------
// Quote stripping
// ---------------------------------------------------------------------------

describe('loadDotenv — quote stripping', () => {
  it('strips surrounding double quotes', () => {
    writeEnv('SECRET="my secret value"\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['SECRET']).toBe('my secret value');
  });

  it('strips surrounding single quotes', () => {
    writeEnv("TOKEN='abc123'\n");
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['TOKEN']).toBe('abc123');
  });

  it('does not strip mismatched quotes', () => {
    writeEnv("KEY='value\"\n");
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['KEY']).toBe("'value\"");
  });

  it('preserves inner quotes when outer quotes are stripped', () => {
    writeEnv('MSG="it\'s fine"\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['MSG']).toBe("it's fine");
  });
});

// ---------------------------------------------------------------------------
// Non-overwrite rule
// ---------------------------------------------------------------------------

describe('loadDotenv — non-overwrite rule', () => {
  it('does not overwrite an existing key', () => {
    writeEnv('FOO=from-file\n');
    const env: Record<string, string | undefined> = { FOO: 'pre-existing' };
    loadDotenv(dir, env);
    expect(env['FOO']).toBe('pre-existing');
  });

  it('writes keys that are absent even when other keys are pre-set', () => {
    writeEnv('FOO=from-file\nBAR=new\n');
    const env: Record<string, string | undefined> = { FOO: 'pre-existing' };
    loadDotenv(dir, env);
    expect(env['FOO']).toBe('pre-existing');
    expect(env['BAR']).toBe('new');
  });

  it('does not overwrite a key explicitly set to empty string', () => {
    writeEnv('FOO=from-file\n');
    const env: Record<string, string | undefined> = { FOO: '' };
    loadDotenv(dir, env);
    expect(env['FOO']).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Malformed lines
// ---------------------------------------------------------------------------

describe('loadDotenv — malformed lines', () => {
  it('skips lines without an = sign', () => {
    writeEnv('INVALID_LINE\nFOO=bar\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env).toEqual({ FOO: 'bar' });
  });

  it('handles empty value (KEY=)', () => {
    writeEnv('EMPTY=\n');
    const env: Record<string, string | undefined> = {};
    loadDotenv(dir, env);
    expect(env['EMPTY']).toBe('');
  });
});
