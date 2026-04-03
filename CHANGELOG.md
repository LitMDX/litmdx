# Changelog

All notable changes to the LitMDX monorepo are documented here.

This changelog tracks the state of the overall project — docs, template, workspace
and the integration between packages. Individual package changelogs are maintained
separately in each `packages/*/CHANGELOG.md`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-04-03

### Summary

Sidebar overrides, WebMCP hardening, workspace ergonomics, developer tooling
improvements, and several bug fixes. Roadmap items 3, 4, and 5 are complete.

### Packages

| Package | Version |
|---|---|
| `@litmdx/core` | `0.1.3` |
| `litmdx` | `0.3.0` |
| `create-litmdx` | `0.1.6` |

### Added

**Sidebar overrides**
- `sidebar_hidden` frontmatter field — setting `sidebar_hidden: true` in any
  `.mdx` file removes it from the sidebar tree entirely
- Group labels now read `sidebar_label` / `title` from the group's `index.mdx`
  frontmatter before falling back to the directory name
- Empty groups (all children hidden) are filtered out of the rendered sidebar

**WebMCP hardening**
- `list_pages` tool now returns `description` alongside `path` and `title`,
  allowing agents to pre-filter pages without additional tool calls
- Input validation in `navigate_to` and `get_page_content`: both throw
  `"path is required"` when the argument is empty or missing
- `search_pages` returns `[]` immediately for an empty query instead of
  searching for the string `"undefined"`

**Workspace ergonomics**
- `@litmdx/core` resolved via `workspace:^` inside the monorepo so the local
  source is always used during development
- `engines: { "node": ">=18.0.0" }` declared in `packages/cli` and
  `packages/core`

**Developer tooling**
- `check` script: full local CI mirror in fail-fast order —
  `lint → format:check → typecheck → build:packages → publish:dry → test`
- `publish:dry` script (`pnpm -r --filter './packages/*' pack --dry-run`) to
  verify package tarballs without touching the registry

**CI / release**
- `ci.yml`: monorepo-level CI running on every push / PR to `main` and `develop`
- `monorepo-release.yml`: tag-based GitHub Release workflow (`v*` tags),
  validates tag against root `package.json` version, auto-marks pre-releases
- `CHANGELOG.md` introduced

### Fixed

- **`sidebar_hidden` silently dropped**: `page-meta.ts` extracted frontmatter
  through a closed `allowedKeys` Set that did not include `sidebar_hidden`,
  causing the field to be discarded before reaching runtime; added to
  `GeneratedFrontmatter` type and `allowedKeys`
- **`webmcp` default wrong in docs**: `docs/reference/configuration.mdx`
  documented the `webmcp` field with default `true`; the real default has
  always been `false` (`user.webmcp ?? false` in `resolveConfig`)
- **`list_pages` example missing `description`**: the example in
  `docs/home/features/webmcp.mdx` did not show the `description` field in the
  `list_pages` response; updated to reflect the actual response shape
- **Stale header comment in `WebMCPIntegration.tsx`**: the opening comment
  listed 3 tools while the implementation registers 5; corrected
- **Dev server crash on port conflict**: `strictPort: true` in the Vite config
  caused a hard crash when port 5173 was occupied; changed to `strictPort: false`
  so Vite falls back to the next available port
- **`pnpm dev` not starting Vite**: the third `concurrently` process was
  running `pnpm --filter litmdx run dev` (a second `tsc --watch`) instead of
  `node packages/cli/dist/bin/cli.js dev`; corrected
- **Cloudflare Pages build failure**: root `build` script was invoking
  `pnpm --filter litmdx run build` (compiles the CLI package) instead of
  `node packages/cli/dist/bin/cli.js build` (builds the docs site); corrected
- **`publish:dry` showing "no new packages"**: `publish --dry-run` checks the
  registry and skips already-published versions; replaced with `pack --dry-run`
- **Group label ignoring frontmatter**: sidebar groups always used the
  directory-derived label; now reads `sidebar_label` / `title` from `index.mdx`
- **`create-litmdx` duplicate `assets/` in published tarball**: removed the
  redundant top-level `"assets"` entry from `files` (assets are already
  included under `dist/assets/`)

### Changed

- `SidebarGroup` now computes `isActive` with `useMemo` and uses the exported
  `hasActiveDescendant` helper from `sidebar/helpers.ts`

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

[0.2.0]: https://github.com/litmdx/litmdx/releases/tag/v0.2.0
[0.1.0]: https://github.com/litmdx/litmdx/releases/tag/v0.1.0
