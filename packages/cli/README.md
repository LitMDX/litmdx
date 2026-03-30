# litmdx

CLI and template for the [LitMDX](https://litmdx.dev) documentation framework.

## Install

```bash
bun add -D litmdx
```

## Commands

```bash
bunx litmdx dev      # start the dev server
bunx litmdx build    # build static site to dist/
```

## Development

```bash
bun run build      # compile src/ + copy template to dist/
bun run typecheck  # type-check src and template
bun run test       # run tests
bun run lint       # ESLint
```

Part of the [LitMDX monorepo](https://github.com/LitMDX/litmdx).
