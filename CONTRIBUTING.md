# Contributing to LitMDX

This document covers how to set up the development environment, understand the project structure, and contribute changes.

## Prerequisites

- [Bun](https://bun.sh) v1.1 or later
- Node.js 18+ (for compatibility checks)

## Setup

```bash
# Clone the repo
git clone https://github.com/litmdx/litmdx.git
cd litmdx

# Install all workspace dependencies
bun install

# Build all packages (core + cli + scaffolder)
bun run build:packages
```

## Development

```bash
# Run the dev server against /docs (this repo's own documentation)
bun run dev

# Run a production build of the docs site
bun run build

# Preview the built site
bun run start
```

The `dev` command runs three processes in parallel:
- `@litmdx/core` in watch mode
- `litmdx` (cli) in watch mode
- The Vite dev server against `/docs`

## Testing

```bash
# Run all tests across all packages
bun run test

# Run tests for a specific package
bun run --filter '@litmdx/core' test
bun run --filter 'litmdx' test
bun run --filter 'create-litmdx' test
```

Tests use [Vitest](https://vitest.dev) and run directly from TypeScript source — no compilation step required.

## Type checking

```bash
bun run typecheck
```

## Linting & formatting

```bash
# Lint all packages
bun run lint

# Fix lint errors
bun run lint:fix

# Format source files with Prettier
bun run format

# Check formatting without writing
bun run format:check
```

## Project structure

```
litmdx/
├── docs/               # Documentation site source (.mdx files)
├── packages/
│   ├── core/           # @litmdx/core — MDX pipeline, router, config resolver
│   ├── cli/            # litmdx — dev/build CLI + Vite integration + template
│   │   └── template/   # Default app shell copied into user projects
│   └── create-litmdx/  # create-litmdx — interactive project scaffolder
├── litmdx.config.ts    # Config for this repo's own docs site
└── package.json        # Root workspace scripts
```

## Package responsibilities

| Package | Published as | Description |
|---|---|---|
| `packages/core` | `@litmdx/core` | MDX compilation pipeline, file-system router, `defineConfig` |
| `packages/cli` | `litmdx` | `litmdx dev`, `litmdx build`, Vite plugin, app template |
| `packages/create-litmdx` | `create-litmdx` | Interactive scaffolder (`npm create litmdx`) |

## Making changes

### Editing the CLI or template

The `packages/cli/template/` directory contains the default React app shell that gets copied into user projects on `litmdx init` or `create-litmdx`. Changes here affect all new projects.

### Editing the scaffolder

`packages/create-litmdx/src/index.ts` generates the initial project files. When changing the generated output, update the corresponding tests in `packages/create-litmdx/tests/`.

### Editing the Vite plugin

`packages/core/src/vite-plugin.ts` is the main integration point between LitMDX and Vite. It handles MDX transformation and virtual modules.
