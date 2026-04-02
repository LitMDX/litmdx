# Changelog

All notable changes to the LitMDX monorepo are documented here.

This changelog tracks the state of the overall project — docs, template, workspace
and the integration between packages. Individual package changelogs are maintained
separately in each `packages/*/CHANGELOG.md`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-04-02

### Summary

Initial stable baseline of the LitMDX monorepo. This release establishes the
core product architecture, the opt-in component system, custom user components,
WebMCP integration, and the full workspace structure.

### Packages

| Package | Version |
|---|---|
| `@litmdx/core` | `0.1.2` |
| `litmdx` | `0.2.3` |
| `create-litmdx` | `0.1.5` |

### Added

**Core product**
- MDX compilation pipeline via `@litmdx/core` with remark/rehype plugin chain
- File-system router with automatic sidebar generation from `docs/` structure
- `defineConfig` API for type-safe configuration in `litmdx.config.ts`
- Vite plugin integration handling MDX transformation and virtual modules
- Static site generation (SSG) with prerender across all routes
- Pagefind integration for zero-dependency full-text search
- Sitemap generation on build
- WebMCP integration — exposes the docs as a structured interface consumable
  by AI agents via `navigator.modelContext` when `webmcp: true` is set in config
- Frontmatter support: `title`, `description`, `order`, `sidebar`, `noindex`

**CLI (`litmdx`)**
- `litmdx dev` — development server with HMR
- `litmdx build` — full production build with SSG, search index and sitemap
- `litmdx init` — initialise a new project from the built-in template
- Vite configuration managed internally; user projects need no `vite.config.ts`

**Scaffolder (`create-litmdx`)**
- `npm create litmdx` interactive scaffolder
- Generates a ready-to-use project with template, config and dependencies

**Opt-in component system**
- Built-in heavy components are opt-in to keep the default bundle small
- Mermaid diagrams available as opt-in (`components.mermaid: true`)
- Formal eligibility rules for future opt-in components (>50 KB gzip, >5 chunks,
  or irrelevant to the majority of sites)
- JSDoc on `ComponentsConfig` documents cost per component
- Tests verify that disabled components are excluded from the bundle

**Custom user components**
- Users can register their own MDX components via `src/components/index.ts|tsx|js|jsx`
- Generated bridge file merges user components into `mdxComponents` automatically
- Watcher in `dev` mode regenerates the bridge on file changes
- Explicit React alias prevents duplicate React instances in workspaces/monorepos

**Docs site**
- Documentation site built with LitMDX itself, covering:
  - Getting started, routing, project structure
  - Features: components, configuration, deployment, frontmatter, search,
    sitemap, SSG, WebMCP
  - Customisation: custom components, Tailwind CSS
  - Reference: CLI, configuration, contributing

**Workspace**
- pnpm workspace monorepo with `packages/core`, `packages/cli`, `packages/create-litmdx`
- Shared `tsconfig.base.json` and `eslint.config.base.js`
- Root scripts: `dev`, `build`, `build:packages`, `test`, `typecheck`,
  `lint`, `format`, `clean`, `setup`
- CI workflows per package (core, cli, create-litmdx) on `main` and `develop`
- Release workflow for npm publishing (`workflow_dispatch`)
- Monorepo CI (`ci.yml`) and monorepo release workflow (`monorepo-release.yml`)

### Notes

- Internal roadmap targets 0–30 day priorities: sidebar overrides, SEO per page,
  search UX improvements, WebMCP hardening, monorepo workspace ergonomics
- `versionado de docs` and `i18n` are explicitly deferred features; will only
  proceed if real repeated demand exists

[0.1.0]: https://github.com/litmdx/litmdx/releases/tag/v0.1.0
