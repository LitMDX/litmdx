import path from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const PACKAGE_JSON_TEMPLATE = `{
  "name": "my-docs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "litmdx dev",
    "build": "litmdx build"
  },
  "dependencies": {
    "@litmdx/cli": "latest",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
`;

const CONFIG_TEMPLATE = `import { defineConfig } from '@litmdx/core';

export default defineConfig({
  title: 'My Docs',
  description: 'Documentation built with LitMDX',
  webmcp: true,
});
`;

const DOCS_INDEX_TEMPLATE = `---
title: Welcome
description: Getting started with your documentation
---

# Welcome

This is your documentation homepage.

## Getting Started

Edit this file at \`docs/index.mdx\` to get started.
`;

export async function initCommand(root: string): Promise<void> {
  const configPath = path.join(root, 'litmdx.config.ts');
  if (existsSync(configPath)) {
    console.error('\n  litmdx.config.ts already exists. Aborting.\n');
    process.exit(1);
  }

  const packageJsonPath = path.join(root, 'package.json');
  const createdPackageJson = !existsSync(packageJsonPath);
  if (createdPackageJson) {
    writeFileSync(packageJsonPath, PACKAGE_JSON_TEMPLATE);
  }

  writeFileSync(configPath, CONFIG_TEMPLATE);

  const docsDir = path.join(root, 'docs');
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(path.join(docsDir, 'index.mdx'), DOCS_INDEX_TEMPLATE);

  console.log('\n  litmdx project initialized successfully!\n');
  console.log('  Files created:');
  if (createdPackageJson) console.log('    package.json');
  console.log('    litmdx.config.ts');
  console.log('    docs/index.mdx');
  console.log('\n  Next steps:');
  console.log('    npm install');
  console.log('    npm run dev\n');
}
