# @litmdx/core

Core library for the [LitMDX](https://litmdx.dev) framework. Consumed by `litmdx` (the CLI) — not intended for direct use in end-user projects.

## What it provides

- **`defineConfig(config)`** — type-safe helper for `litmdx.config.ts`
- **`resolveConfig(user?)`** — merges user config with defaults
- **`resolveRoutes(glob)`** — maps `import.meta.glob` entries to URL routes
- **`createVitePlugin()`** — Vite plugin bundle (Tailwind v4, MDX, Shiki)

## Exports

```ts
import { defineConfig } from '@litmdx/core';
import { createVitePlugin } from '@litmdx/core/vite-plugin';
import { resolveConfig } from '@litmdx/core/config';
import { resolveRoutes } from '@litmdx/core/router';
```

## Development

```bash
bun run build      # compile to dist/
bun run typecheck  # type-check without emitting
bun run test       # run tests
bun run lint       # ESLint
```
