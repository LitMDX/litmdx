import path from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import prompts from 'prompts';

interface ProjectConfig {
  projectName: string;
  directory: string;
}

async function getProjectConfig(): Promise<ProjectConfig> {
  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name',
      initial: 'my-docs',
    },
    {
      type: 'text',
      name: 'directory',
      message: 'Directory (defaults to project name)',
      initial: '',
    },
  ]);

  const projectName = response.projectName || 'my-docs';
  const directory = response.directory || projectName;

  return { projectName, directory };
}

function generatePackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'litmdx dev',
        build: 'litmdx build',
      },
      dependencies: {
        litmdx: 'latest',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
    },
    null,
    2,
  );
}

function generateConfig(projectName: string): string {
  return `import { defineConfig } from '@litmdx/core';

export default defineConfig({
  title: '${projectName}',
  description: 'Documentation built with LitMDX',
  webmcp: false,
});
`;
}

function generateIndexMdx(): string {
  return `---
title: Welcome
description: Getting started with LitMDX
---

# Welcome

This is your LitMDX documentation site.

## Getting started

Edit \`docs/index.mdx\` to get started.
`;
}

export async function createProject(): Promise<void> {
  console.log('\\n  🚀 Creating new LitMDX project\\n');

  const config = await getProjectConfig();
  const projectDir = path.resolve(process.cwd(), config.directory);

  if (existsSync(projectDir)) {
    console.error(`\n  ❌ Directory already exists: ${config.directory}\n`);
    process.exit(1);
  }

  mkdirSync(projectDir, { recursive: true });
  mkdirSync(path.join(projectDir, 'docs'), { recursive: true });

  writeFileSync(path.join(projectDir, 'package.json'), generatePackageJson(config.projectName));

  writeFileSync(path.join(projectDir, 'litmdx.config.ts'), generateConfig(config.projectName));

  writeFileSync(path.join(projectDir, 'docs', 'index.mdx'), generateIndexMdx());

  console.log('  ✅ Project created successfully!\n');
  console.log('  Next steps:\n');
  console.log(`    cd ${config.directory}`);
  console.log('    npm install');
  console.log('    npm run dev\n');
}
