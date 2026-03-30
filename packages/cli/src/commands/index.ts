import { devCommand, isPortFree, findFreePort } from './dev.js';
import { buildCommand } from './build.js';
import { initCommand } from './init.js';

export type CliCommand = 'dev' | 'build' | 'init';
export { isPortFree, findFreePort };

export function parseCommand(argv: string[]): CliCommand {
  const [, , rawCommand = 'dev'] = argv;

  if (rawCommand !== 'dev' && rawCommand !== 'build' && rawCommand !== 'init') {
    throw new Error(`Unknown command: ${rawCommand}\nUsage: litmdx <init|dev|build>`);
  }

  return rawCommand;
}

interface RunOptions {
  root: string;
}

export async function run(command: CliCommand, options: RunOptions): Promise<void> {
  const { root } = options;

  if (command === 'init') {
    await initCommand(root);
    return;
  }

  if (command === 'dev') {
    await devCommand(root);
    return;
  }

  if (command === 'build') {
    await buildCommand(root);
    return;
  }
}
