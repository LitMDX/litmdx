# LitMDX

Fast, modern documentation framework built on React + MDX.

→ **[litmdx.dev](https://litmdx.dev)**

## Get started

Scaffold a new project in seconds:

```bash
# npm
npm create litmdx@latest

# npx
npx create-litmdx@latest

# bun
bunx create-litmdx@latest

# pnpm
pnpm create litmdx@latest
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
- **Auto sidebar** — grouped and sorted from frontmatter, with custom labels and ordering via frontmatter
- **Built-in components** — `Callout`, `Tabs`, `Steps`, `Card`, `Badge`, `CodeGroup` — no imports needed
- **Syntax highlighting** — Shiki, server-side, zero client JS
- **Static Site Generation (SSG)** — prerendered HTML per route, not just a single SPA entry
- **Full-text search** — powered by [Pagefind](https://pagefind.app), runs entirely in the browser — no server, no API key
- **Sitemap** — automatic `sitemap.xml` generation for SEO
- **WebMCP** — expose your docs as tools for AI agents via the [W3C WebMCP spec](https://webmachinelearning.github.io/webmcp/)
- **Deploy anywhere** — Vercel, Netlify, GitHub Pages, Cloudflare Pages
- **Scaffolder** — `npm create litmdx` sets up a new project instantly

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
  nav: [
    { label: 'Guide', to: '/guide' },
    { label: 'GitHub', href: 'https://github.com/org/repo' },
  ],
  webmcp: true, // expose docs as tools for AI agents
});
```

## Packages

| Package | Description |
|---|---|
| [`@litmdx/core`](packages/core) | MDX pipeline, router, config resolver |
| [`litmdx`](packages/cli) | `litmdx dev` and `litmdx build` commands |
| [`create-litmdx`](packages/create-litmdx) | Project scaffolder (`npm create litmdx`) |

For contributing and local development, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
