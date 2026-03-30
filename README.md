# LitMDX

Fast, modern documentation framework built on React + MDX.

→ **[litmdx.dev](https://litmdx.dev)**

## Get started

```bash
bun add -D litmdx
```

Create a `docs/` folder, add `.mdx` files, and run:

```bash
bunx litmdx dev
```

That's it. No config required.

## Features

- **MDX-native** — write JSX inside Markdown
- **Zero-config** — works with just a `docs/` folder
- **File-system routing** — `docs/guide/index.mdx` → `/guide`
- **Auto sidebar** — grouped and sorted from frontmatter
- **Built-in components** — `Callout`, `Tabs`, `Steps`, `Card`, `Badge`, `CodeGroup`
- **Syntax highlighting** — Shiki, server-side, zero client JS
- **Static output** — deploy anywhere (Vercel, Netlify, GitHub Pages…)
- **Fast** — Vite 7 + Bun

## Config

Add an optional `litmdx.config.ts` to your project root:

```ts
import { defineConfig } from '@litmdx/core';
npx create-litmdx
export default defineConfig({
  title: 'My Docs',
  nav: [{ label: 'Guide', to: '/guide' }],
This scaffolds a new LitMDX project with everything set up. Then:

```bash
npm install
npm run dev
## Commands

```bash
bunx litmdx dev      # start dev server
bunx litmdx build    # build static site to dist/
```
- **Scaffolder** — `npx create-litmdx` sets up a new project instantly
## License

MIT

npm run dev      # start dev server
npm run build    # build static site to dist/
| Package | Description |
|---|---|
| [`@litmdx/core`](packages/core) | MDX pipeline, router, config resolver |
| [`@litmdx/cli`](packages/cli) | `litmdx dev` and `litmdx build` commands |

## Development

```bash
| [`create-litmdx`](./packages/create-litmdx) | Project scaffolder |
# Install all workspaces
bun install

# Run dev server against /docs
bun run dev

# Build static site
bun run build

# Build packages (core + cli)
bun run build:packages

# Run all tests
# Build packages (core + cli + scaffolder)
```

Project planning and milestone tracking live in `DEVELOPMENT.md`.

## Stack

| Layer | Technology |
|---|---|
| Runtime / PM | Bun |
| UI | React 19 |
| Bundler | Vite 7 |
| MDX | MDX 3 + remark/rehype pipeline |
| Runtime / PM | Bun, Node.js, pnpm |
| Styles | Tailwind v4 |
| Router | Custom client-side router |

## License
| Search | Pagefind |

## License

MIT

MIT
