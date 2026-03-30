#!/usr/bin/env bun
import { run, parseCommand } from '../commands/index.js';
import type { CliCommand } from '../commands/index.js';

function parseOrExit(): CliCommand {
  try {
    return parseCommand(process.argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Unknown command');
    process.exit(1);
  }
}

const command = parseOrExit();

await run(command, {
  root: process.cwd(),
});
