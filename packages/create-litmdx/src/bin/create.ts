#!/usr/bin/env node
import { createProject } from '../index.js';

async function main() {
  try {
    await createProject();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Failed to create LitMDX project');
    process.exit(1);
  }
}

void main();
