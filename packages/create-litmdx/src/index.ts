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
      light: '/favicon-light.svg',
      dark: '/favicon-dark.svg',
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

function generateLightLogoSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="LitMDX Light Logo">
  <rect width="160" height="40" rx="10" fill="#f5f7ff"/>
  <circle cx="20" cy="20" r="8" fill="#1d4ed8"/>
  <text x="36" y="25" font-family="ui-sans-serif, system-ui" font-size="16" fill="#0f172a">LitMDX</text>
</svg>
`;
}

function generateDarkLogoSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="LitMDX Dark Logo">
  <rect width="160" height="40" rx="10" fill="#0f172a"/>
  <circle cx="20" cy="20" r="8" fill="#60a5fa"/>
  <text x="36" y="25" font-family="ui-sans-serif, system-ui" font-size="16" fill="#e2e8f0">LitMDX</text>
</svg>
`;
}

function generateLightFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="LitMDX Light Favicon">
  <rect width="64" height="64" rx="14" fill="#eff6ff"/>
  <path d="M18 32h28" stroke="#1d4ed8" stroke-width="6" stroke-linecap="round"/>
  <path d="M32 18v28" stroke="#1d4ed8" stroke-width="6" stroke-linecap="round"/>
</svg>
`;
}

function generateDarkFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="LitMDX Dark Favicon">
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <path d="M18 32h28" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
  <path d="M32 18v28" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
</svg>
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
  mkdirSync(path.join(projectDir, 'docs', 'guides'), { recursive: true });
  mkdirSync(path.join(projectDir, 'docs', 'components'), { recursive: true });
  mkdirSync(path.join(projectDir, 'public'), { recursive: true });

  writeFileSync(path.join(projectDir, 'package.json'), generatePackageJson(config.projectName));

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

  writeFileSync(path.join(projectDir, 'public', 'logo-light.svg'), generateLightLogoSvg());
  writeFileSync(path.join(projectDir, 'public', 'logo-dark.svg'), generateDarkLogoSvg());
  writeFileSync(path.join(projectDir, 'public', 'favicon-light.svg'), generateLightFaviconSvg());
  writeFileSync(path.join(projectDir, 'public', 'favicon-dark.svg'), generateDarkFaviconSvg());

  console.log('  ✅ Project created successfully!\n');
  console.log('  Next steps:\n');
  console.log(`    cd ${config.directory}`);
  console.log('    npm install');
  console.log('    npm run dev\n');
}
