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
    author: 'My Docs Team',
    themeColor: '#1d4ed8',
    keywords: ['docs', 'litmdx', 'my-docs'],
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

Start with the guides and component examples:

- [Getting Started](/guides/getting-started)
- [Button Component](/components/button)
`;

const DOCS_GUIDES_GETTING_STARTED_TEMPLATE = `---
title: Getting Started
description: First steps for your docs project
---

# Getting Started

This section is grouped under \`docs/guides\`.

## Next step

Open [Button Component](/components/button) to see another grouped page.
`;

const DOCS_COMPONENTS_BUTTON_TEMPLATE = `---
title: Button Component
description: Example component documentation page
---

# Button Component

This section is grouped under \`docs/components\`.

## Usage

Use this page as a base for your component docs.
`;

const LOGO_LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="LitMDX Light Logo">
  <rect width="160" height="40" rx="10" fill="#f5f7ff"/>
  <circle cx="20" cy="20" r="8" fill="#1d4ed8"/>
  <text x="36" y="25" font-family="ui-sans-serif, system-ui" font-size="16" fill="#0f172a">LitMDX</text>
</svg>
`;

const LOGO_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="LitMDX Dark Logo">
  <rect width="160" height="40" rx="10" fill="#0f172a"/>
  <circle cx="20" cy="20" r="8" fill="#60a5fa"/>
  <text x="36" y="25" font-family="ui-sans-serif, system-ui" font-size="16" fill="#e2e8f0">LitMDX</text>
</svg>
`;

const FAVICON_LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="LitMDX Light Favicon">
  <rect width="64" height="64" rx="14" fill="#eff6ff"/>
  <path d="M18 32h28" stroke="#1d4ed8" stroke-width="6" stroke-linecap="round"/>
  <path d="M32 18v28" stroke="#1d4ed8" stroke-width="6" stroke-linecap="round"/>
</svg>
`;

const FAVICON_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="LitMDX Dark Favicon">
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <path d="M18 32h28" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
  <path d="M32 18v28" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
</svg>
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
  mkdirSync(path.join(docsDir, 'guides'), { recursive: true });
  mkdirSync(path.join(docsDir, 'components'), { recursive: true });

  const publicDir = path.join(root, 'public');
  mkdirSync(publicDir, { recursive: true });

  writeFileSync(path.join(docsDir, 'index.mdx'), DOCS_INDEX_TEMPLATE);
  writeFileSync(
    path.join(docsDir, 'guides', 'getting-started.mdx'),
    DOCS_GUIDES_GETTING_STARTED_TEMPLATE,
  );
  writeFileSync(path.join(docsDir, 'components', 'button.mdx'), DOCS_COMPONENTS_BUTTON_TEMPLATE);

  writeFileSync(path.join(publicDir, 'logo-light.svg'), LOGO_LIGHT_SVG);
  writeFileSync(path.join(publicDir, 'logo-dark.svg'), LOGO_DARK_SVG);
  writeFileSync(path.join(publicDir, 'favicon-light.svg'), FAVICON_LIGHT_SVG);
  writeFileSync(path.join(publicDir, 'favicon-dark.svg'), FAVICON_DARK_SVG);

  console.log('\n  litmdx project initialized successfully!\n');
  console.log('  Files created:');
  if (createdPackageJson) console.log('    package.json');
  console.log('    litmdx.config.ts');
  console.log('    docs/index.mdx');
  console.log('    docs/guides/getting-started.mdx');
  console.log('    docs/components/button.mdx');
  console.log('    public/logo-light.svg');
  console.log('    public/logo-dark.svg');
  console.log('    public/favicon-light.svg');
  console.log('    public/favicon-dark.svg');
  console.log('\n  Next steps:');
  console.log('    npm install');
  console.log('    npm run dev\n');
}
