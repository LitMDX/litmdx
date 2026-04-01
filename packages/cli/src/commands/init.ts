import path from 'path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

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
    light: '/logo-light.png',
    dark: '/logo-dark.png',
  },
  github: 'https://github.com/LitMDX/litmdx',
  head: {
    favicon: {
      light: '/logo-light.png',
      dark: '/logo-dark.png',
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PUBLIC_DIR = path.resolve(__dirname, '../../template/public');

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

  copyFileSync(
    path.join(TEMPLATE_PUBLIC_DIR, 'logo-light.png'),
    path.join(publicDir, 'logo-light.png'),
  );
  copyFileSync(
    path.join(TEMPLATE_PUBLIC_DIR, 'logo-dark.png'),
    path.join(publicDir, 'logo-dark.png'),
  );

  console.log('\n  litmdx project initialized successfully!\n');
  console.log('  Files created:');
  if (createdPackageJson) console.log('    package.json');
  console.log('    litmdx.config.ts');
  console.log('    docs/index.mdx');
  console.log('    docs/guides/getting-started.mdx');
  console.log('    docs/components/button.mdx');
  console.log('    public/logo-light.png');
  console.log('    public/logo-dark.png');
  console.log('\n  Next steps:');
  console.log('    npm install');
  console.log('    npm run dev\n');
}
