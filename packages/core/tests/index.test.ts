import { describe, it, expect } from 'vitest';
import { defineConfig } from '../src/index.js';

describe('defineConfig', () => {
  it('returns the config object unchanged', () => {
    const input = { title: 'Test', docsDir: 'pages' };
    expect(defineConfig(input)).toBe(input);
  });

  it('accepts an empty config', () => {
    expect(defineConfig({})).toEqual({});
  });
});
