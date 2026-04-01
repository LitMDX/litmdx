import path from 'path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
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

export function generatePackageJson(projectName: string): string {
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

export function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        types: ['react', 'react-dom'],
        jsx: 'react-jsx',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['litmdx.config.ts', 'src'],
    },
    null,
    2,
  );
}

export function generateConfig(projectName: string): string {
  return `import { defineConfig } from '@litmdx/core';

export default defineConfig({
  title: '${projectName}',
  description: 'Documentation built with LitMDX',
  baseUrl: '/',
  siteUrl: 'https://example.com',
  docsDir: 'docs',
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  },
  github: 'https://github.com/LitMDX/litmdx',
  head: {
    favicon: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
    },
    lang: 'en',
    author: '${projectName}',
    themeColor: '#1d4ed8',
    keywords: ['docs', 'litmdx', '${projectName}'],
  },
  openGraph: {
    image: 'https://example.com/og.png',
    twitterCard: 'summary_large_image',
    twitterSite: '@litmdx',
    locale: 'en_US',
  },
  footer: {
    description: 'Built with LitMDX',
  },
  nav: [
    { label: 'Getting Started', to: '/guides/getting-started' },
    { label: 'GitHub', href: 'https://github.com/LitMDX/litmdx' },
  ],
  plugins: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
  webmcp: false,
});
`;
}

export function generateIndexMdx(): string {
  return `---
title: Welcome
description: Getting started with LitMDX
---

# Welcome

This is your LitMDX documentation site.

## Getting started

Start with the guides and component examples:

- [Getting Started](/guides/getting-started)
- [Button Component](/components/button)
`;
}

export function generateGuidesGettingStartedMdx(): string {
  return `---
title: Getting Started
description: First steps for your docs project
---

# Getting Started

This section is grouped under \`docs/guides\`.

## Next step

Open [Button Component](/components/button) to see another grouped page.
`;
}

export function generateComponentsButtonMdx(): string {
  return `---
title: Button Component
description: Example component documentation page
---

# Button Component

This section is grouped under \`docs/components\`.

## Usage

Use this page as a base for your component docs.
`;
}

export async function createProject(): Promise<void> {
  console.log('\\n  🚀 Creating new LitMDX project\\n');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ASSETS_DIR = path.resolve(__dirname, '../assets');
  const config = await getProjectConfig();
  const projectDir = path.resolve(process.cwd(), config.directory);

  if (existsSync(projectDir)) {
    console.error(`\n  ❌ Directory already exists: ${config.directory}\n`);
    process.exit(1);
  }

  mkdirSync(projectDir, { recursive: true });
  mkdirSync(path.join(projectDir, 'docs'), { recursive: true });
  mkdirSync(path.join(projectDir, 'docs', 'guides'), { recursive: true });
  mkdirSync(path.join(projectDir, 'docs', 'components'), { recursive: true });
  mkdirSync(path.join(projectDir, 'public'), { recursive: true });

  writeFileSync(path.join(projectDir, 'package.json'), generatePackageJson(config.projectName));
  writeFileSync(path.join(projectDir, 'tsconfig.json'), generateTsConfig());
  writeFileSync(path.join(projectDir, 'litmdx.config.ts'), generateConfig(config.projectName));

  writeFileSync(path.join(projectDir, 'docs', 'index.mdx'), generateIndexMdx());
  writeFileSync(
    path.join(projectDir, 'docs', 'guides', 'getting-started.mdx'),
    generateGuidesGettingStartedMdx(),
  );
  writeFileSync(
    path.join(projectDir, 'docs', 'components', 'button.mdx'),
    generateComponentsButtonMdx(),
  );

  copyFileSync(
    path.join(ASSETS_DIR, 'logo-light.svg'),
    path.join(projectDir, 'public', 'logo-light.svg'),
  );
  copyFileSync(
    path.join(ASSETS_DIR, 'logo-dark.svg'),
    path.join(projectDir, 'public', 'logo-dark.svg'),
  );

  console.log('  ✅ Project created successfully!\n');
  console.log('  Next steps:\n');
  console.log(`    cd ${config.directory}`);
  console.log('    npm install');
  console.log('    npm run dev\n');
}
