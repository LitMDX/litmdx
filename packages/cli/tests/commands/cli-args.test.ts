import { describe, expect, it } from 'vitest';
import { parseCommand } from '../../src/commands/index.js';

describe('parseCommand', () => {
  it('defaults to dev when no command is provided', () => {
    expect(parseCommand(['bun', 'cli.js'])).toBe('dev');
  });

  it('accepts the dev command', () => {
    expect(parseCommand(['bun', 'cli.js', 'dev'])).toBe('dev');
  });

  it('accepts the build command', () => {
    expect(parseCommand(['bun', 'cli.js', 'build'])).toBe('build');
  });

  it('accepts the init command', () => {
    expect(parseCommand(['bun', 'cli.js', 'init'])).toBe('init');
  });

  it('throws with usage information for an unknown command', () => {
    expect(() => parseCommand(['bun', 'cli.js', 'preview'])).toThrow(
      'Unknown command: preview\nUsage: litmdx <init|dev|build>',
    );
  });
});
