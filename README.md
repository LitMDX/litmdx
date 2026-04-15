# LitMDX

Fast, modern open source documentation framework built on React + MDX.

→ **[litmdx.dev](https://litmdx.dev)**

## Get started

Scaffold a new project in seconds:

```bash
# npm
npm create litmdx@latest

# pnpm
pnpm create litmdx@latest

# bun
bunx create-litmdx@latest
```

This creates a new directory with a ready-to-use docs project. Then:

```bash
cd my-docs
npm install
npm run dev
```

### Add to an existing project

```bash
npm install litmdx
```

Create a `docs/` folder, add `.mdx` files, and run:

```bash
npx litmdx dev
```

## Features

- **MDX-native** — write JSX inside Markdown
- **Zero-config** — works with just a `docs/` folder
- **File-system routing** — `docs/guide/index.mdx` → `/guide`
- **Nested sidebar groups** — up to 2 levels of grouping, ordered via `sidebar_position` in `index.mdx`
- **Built-in components** — `Callout`, `Tabs`, `Steps`, `Card`, `CardGrid`, `Badge`, `CodeGroup` — no imports needed
- **Custom components** — register your own React components globally; override built-in element renderers
- **Syntax highlighting** — Shiki, server-side, zero client JS
- **Static Site Generation (SSG)** — prerendered HTML per route, not just a single SPA entry
- **Full-text search** — powered by [Pagefind](https://pagefind.app), runs entirely in the browser — no server, no API key
- **Tailwind CSS v4** — built-in, zero config; use utility classes in custom components and MDX pages with full `dark:` support
- **Sitemap** — automatic `sitemap.xml` generation
- **Multi-section mode** — organize large sites into independent sections, each with its own sidebar
- **WebMCP** — expose your docs as tools for AI agents via the [W3C WebMCP spec](https://webmachinelearning.github.io/webmcp/)
- **Deploy anywhere** — Vercel, Netlify, GitHub Pages, Cloudflare Pages

## Commands

```bash
npx litmdx dev      # start dev server
npx litmdx build    # build static site to dist/
```

## Config

Add an optional `litmdx.config.ts` to your project root:

```ts
import { defineConfig } from '@litmdx/core';

export default defineConfig({
  title: 'My Docs',
  description: 'Documentation built with LitMDX',
  siteUrl: 'https://my-docs.example.com', // required for sitemap
  logo: {
    light: '/logo-light.png',
    dark:  '/logo-dark.png',
  },
  nav: [
    { label: 'Guide', to: '/guide' },
    { label: 'GitHub', href: 'https://github.com/org/repo' },
  ],
  webmcp: true, // expose docs as tools for AI agents
});
```

## Sidebar ordering

Use `sidebar_position` in frontmatter to control page and group order. In a group's `index.mdx`, `sidebar_position` sets where the **group** appears relative to its siblings:

```
features/
├── index.mdx              ← sidebar_position: 2  (Features group is 2nd at root)
├── configuration.mdx      ← sidebar_position: 1
└── customization/
    └── index.mdx          ← sidebar_position: 4  (sub-group is 4th inside Features)
```

Groups without an `index.mdx` use the minimum `sidebar_position` among their children.

## Custom components

Register your own React components in `src/components/index.tsx` — they become available in every MDX file without any import:

```tsx
// src/components/index.tsx
export { MyButton } from './MyButton';
export { PricingTable } from './PricingTable';
```

```mdx
<!-- docs/pricing.mdx -->
<PricingTable plan="pro" />
```

## Packages

| Package | Description |
|---|---|
| [`@litmdx/core`](packages/core) | MDX pipeline, router, config resolver |
| [`litmdx`](packages/cli) | `litmdx dev` and `litmdx build` commands |
| [`create-litmdx`](packages/create-litmdx) | Project scaffolder (`npm create litmdx`) |

For contributing and local development, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0
