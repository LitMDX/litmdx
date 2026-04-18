# Changelog

All notable changes to the LitMDX monorepo are documented here.

This changelog tracks the state of the overall project — docs, template, workspace
and the integration between packages. Individual package changelogs are maintained
separately in each `packages/*/CHANGELOG.md`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] — Unreleased

### Summary

Internal refactoring for maintainability: separation of concerns in
`packages/cli/src/search/` and `packages/cli/src/vite/`, plus a significant
expansion of the test suite (30 → 32 test files, 613 → 625 tests passing).
No user-facing behaviour changes.

### Packages

| Package | Version |
|---|---|
| `@litmdx/core` | `0.2.0` |
| `litmdx` | `0.4.0` |
| `create-litmdx` | `0.1.7` (unchanged) |

### Added

**Environment variable support for agent config** (`@litmdx/core`)
- `resolveAgentConfig` now reads `LITMDX_AGENT_URL` as a fallback for
  `agent.serverUrl` before defaulting to `http://localhost:8000`.
  Priority: `agent.serverUrl` in config → `LITMDX_AGENT_URL` env var → default.

**Docs site env vars** (litmdx.dev)
- `litmdx.config.ts` now reads `LITMDX_SITE_URL`, `LITMDX_GITHUB_URL`, and
  `LITMDX_AGENT_URL` from the environment instead of hardcoded values.
- `.env.example` added to the repo root documenting all three variables.

### Changed

**SoC refactoring — `packages/cli/src/search/`** (`litmdx`)
- Extracted `src/search/mdx-parser.ts` — pure function `parseMdxSource(source,
  fallbackName)` that handles frontmatter extraction and prose cleaning.
  Previously duplicated between `docs-index.ts` and `pagefind-index.ts`.
- Extracted `src/search/route-resolver.ts` — pure functions
  `resolveDocRoute`, `resolveIndexedRoutes`, `isMultiSectionMode`, and
  `rewriteHomeRoutes` shared by both indexers. Previously duplicated between
  the two files.
- `src/search/docs-index.ts` slimmed to I/O + orchestration only:
  `walkMdx → parseMdxSource → resolveDocRoute → writeFileSync`.
- `src/search/pagefind-index.ts` slimmed to Pagefind API wiring only,
  delegating all parsing and routing to the shared modules.
- `src/search/index.ts` barrel unchanged — public API unaffected.

**SoC refactoring — `packages/cli/src/vite/`** (`litmdx`)
- Extracted `src/vite/plugins/docs-index-middleware.ts` — the
  `docsIndexMiddlewarePlugin(docsDir)` Vite plugin that serves
  `/docs-index.json` during dev is now a standalone file alongside the other
  plugins under `plugins/`.
- Extracted `src/vite/user-config.ts` — `loadUserConfig(root)` has its own
  module with single responsibility: read and return `litmdx.config.ts` via
  Vite's `loadConfigFromFile`. Previously inlined in `config.ts`.
- `src/vite/config.ts` is now a pure assembler: imports plugins and
  `loadUserConfig`, only exports `buildViteConfig`.
- `src/vite/index.ts` barrel updated to re-export `loadUserConfig` from
  `user-config.js` directly (backward-compatible — `build.ts` import unchanged).

**Documentation fix** (`@litmdx/core` → `0.2.0`)
- JSDoc comment on `ResolvedAgentConfig.serverUrl` corrected: previously stated
  the field was "NOT sent to the browser" which was inaccurate — the entire
  `ResolvedAgentConfig` is serialized into `virtual:litmdx-config`. The field
  is not a secret (it is a URL) but the comment was misleading.
- Version bumped to `0.2.0` to reflect the agent config integration
  (`AgentConfig`, `ResolvedAgentConfig`, `resolveAgentConfig`) introduced in
  previous sessions.

### Tests

- `tests/search/mdx-parser.test.ts` — 20 unit tests for `parseMdxSource`
  (pure function, no mocks needed).
- `tests/search/route-resolver.test.ts` — tests for all four route resolver
  functions covering single-section, multi-section, and home rewrite scenarios.
- `tests/vite/plugins/docs-index-middleware.test.ts` — 8 tests covering plugin
  shape, middleware registration (including failure path), response headers, and
  response body.
- `tests/vite/user-config.test.ts` — 4 integration tests for `loadUserConfig`:
  absent config, basic fields, full fields, empty export.
- `tests/commands/init.test.ts` — 27 tests for `initCommand` covering
  scaffolding, file writes, directory creation, and error paths.
- `tests/commands/build.test.ts` — 21 tests for `buildCommand` covering
  conditional Pagefind, docs-index, sitemap, and robots invocations.

---

## [0.3.0] — Unreleased

### Summary

SEO per-page metadata (roadmap item 5), automatic `robots.txt` generation,
Core Web Vitals improvements (lazy images, logo preload, async decoding,
per-route canonical on SPA navigation), Structured Data / JSON-LD support,
mobile-first UI polish, and two publish-pipeline bug fixes from the previous
unreleased patch.

### Packages

| Package | Version |
|---|---|
| `@litmdx/core` | `0.2.0` |
| `litmdx` | `0.3.2` |
| `create-litmdx` | `0.1.7` (unchanged) |

### Added

**Per-page SEO metadata** (`litmdx`)
- `image` frontmatter field — absolute URL to a page-specific Open Graph image.
  Overrides `openGraph.image` from config for that route only. During
  `litmdx build`, injects `<meta property="og:image" content="...">` into the
  prerendered HTML for the matching route.
- `noindex` frontmatter field — when `true`, injects
  `<meta name="robots" content="noindex">` into the prerendered HTML for that
  route. Useful for internal drafts or pages not ready for public indexing.
- `PrerenderHead` extended with `ogImage` and `noindex` fields so both values
  flow from frontmatter through `renderStaticRoute` into `injectStaticMarkup`.
- `<meta name="robots" content="index, follow" />` added to every generated
  page by default. Pages with `noindex: true` in frontmatter override this with
  `content="noindex"`.
- `<link rel="canonical" href="...">` injected per route during SSG using the
  route's absolute URL (`siteUrl` + path). The template base also sets it to
  `<siteUrl>/` so crawlers always have a canonical even before JS hydrates.
  A new `upsertLink` helper in `ssg/helpers.ts` handles insertion and replacement.

**`robots.txt` generation** (`litmdx`)
- `litmdx build` now always writes `robots.txt` to `outDir`. When `siteUrl` is
  configured, the file includes a `Sitemap:` directive pointing to
  `<siteUrl>/sitemap.xml`. Generation never fails the build (caught + warned,
  same pattern as sitemap and pagefind).
- New module `packages/cli/src/sitemap/robots.ts` with exported
  `renderRobots(siteUrl?)` and `buildRobots(outDir, siteUrl?)` functions.

**Core Web Vitals** (`litmdx`)
- **Lazy image loading** — every standard Markdown image (`![alt](src)`) in an
  MDX page is now rendered through a built-in `MdxImage` component registered
  as the `img` override in `mdxComponents`. Default attributes:
  `loading="lazy"` (deferred download) and `decoding="async"` (off-thread
  decode). Both can be overridden per-image with MDX JSX syntax.
- **Logo preload** — `generateIndexHtml` now emits
  `<link rel="preload" as="image" fetchpriority="high">` for the configured
  `logo` asset(s) inside `<head>`, so the browser starts fetching the logo
  image before the JS bundle executes. Themed logos (`light`/`dark` variants)
  emit media-query-qualified preload links.
- **Logo async decoding** — the `<img>` elements rendered by `Header`'s
  `renderLogo` function now carry `decoding="async"` so image decoding does
  not block the main thread during initial render.
- **SPA canonical update** — `usePageMeta` now calls `setLink('canonical', href)`
  on every navigation, keeping the `<link rel="canonical">` in sync with
  `window.location.href` during client-side routing. Previously only `og:url`
  was updated.

**Documentation SEO** (litmdx.dev)
- `litmdx.config.ts` description rewritten for search discoverability;
  `keywords` expanded with `litmdx`, `open source`, `docs framework`,
  `static site generator`, `react documentation`, `developer docs`.
- `public/robots.txt` created with `Sitemap: https://litmdx.dev/sitemap.xml`.
- Frontmatter `title` and `description` improved across all 11 public pages
  (home, getting-started, configuration, components, search, SSG, sitemap,
  frontmatter, reference index, CLI reference, configuration reference) with
  product name, relevant keywords, and longer descriptions that match search
  intent.

**Structured Data / JSON-LD** (`litmdx`)
- `schema_type` frontmatter field — sets the `@type` of the auto-generated JSON-LD
  block. Accepts any string; defaults to `"TechArticle"`.
- **Auto-generation**: every page with a `title` now emits a
  `<script type="application/ld+json">` block automatically. The generated object
  uses `@context: https://schema.org`, `@type` from `schema_type` (default
  `TechArticle`), `headline` from `title`, and `description` when present.
  No frontmatter changes required for the default behaviour.
- During `litmdx build`, the schema is serialized and emitted in the `<head>` of
  the prerendered HTML for that route. `</script>` sequences inside the payload are
  escaped to `<\/script>` to prevent early tag termination (XSS guard).
- In SPA mode, `usePageMeta` manages a single
  `<script type="application/ld+json" data-litmdx-schema>` element: inserted on
  navigation to a page with a schema, updated in-place on re-render, removed when
  navigating to a page without one.
- New `buildPageSchema(frontmatter)` helper in `template/src/lib/schema.ts`.
- `PrerenderHead` extended with optional `schema?: string` (pre-serialized JSON).
- `Frontmatter` type extended with `schema_type?`.
- Docs site updated: `home/index.mdx` and both `reference/index.mdx` and
  `features/customization/index.mdx` use `schema_type: WebPage`; all other pages
  auto-generate `TechArticle`.

**Documentation** (litmdx.dev)
- `frontmatter.mdx` — **Structured data** section documents `schema_type` for
  customising the auto-generated JSON-LD type. Includes `@type` reference table
  and callout on per-page scope.

**Mobile-first UI** (`litmdx`)
- Action buttons (search, GitHub, theme toggle) moved from the header to the
  mobile sidebar drawer, freeing full header width for the project title.
  On desktop (≥ 1280 px) they remain in the header as before; the in-sidebar
  row is hidden via CSS.
- `Sidebar` component accepts three new props required for the in-drawer
  actions: `onOpenSearch`, `theme`, and `onToggleTheme`.
- Header title (`app-brand-title`) now truncates with an ellipsis when the
  project name is too long to fit. The title `<span>` carries
  `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` while the
  wrapping flex containers carry `min-width: 0` so the truncation propagates
  correctly.
- `app-sidebar-toggle` gains `flex-shrink: 0` so the hamburger icon is never
  squeezed by a long title.
- `app-header-actions` is `display: none` on mobile and shown with
  `display: flex` at ≥ 1280 px, preventing the double-action-bar layout.
- Mobile sidebar (`app-sidebar-frame`) is now centered on screen with
  `left: 50%; transform: translateX(-50%)` and opens with a fade + subtle
  scale animation instead of sliding in from the left edge.
- Header background is `var(--bg-surface)` (solid) on mobile so the dark
  overlay behind the sidebar does not bleed through. The `backdrop-filter` blur
  is restored at ≥ 1280 px where no overlay is shown.
- `sidebar-mobile-actions` CSS block added: a flex row of icon buttons at the
  top of the sidebar drawer; hidden at ≥ 1280 px alongside `sidebar-mobile-nav`.
- `html { font-size: 16px }` in `base.css` prevents iOS auto-zoom on inputs.
- Tap-target minimum height (`min-height: 2.75rem` ≈ 44 px) on
  `sidebar-link`, `sidebar-mobile-nav-link`, and `sidebar-group-trigger` on
  mobile; unset at ≥ 1280 px.
- `app-layout` padding tightened to `1rem` on mobile, restored to `1.25rem` at
  ≥ 1280 px.
- Responsive `clamp()` typography for `.prose h2` and `.prose h3`.

### Fixed

- **`create-litmdx` assets not found on `npx create-litmdx`**: `ASSETS_DIR`
  was resolved using `'../assets'` relative to `dist/index.js`, which pointed
  to the package root (no assets there). Changed to `'./assets'` so it
  correctly resolves to `dist/assets/` where the build script copies them.
- **`workspace:^` leaked into published `litmdx` package**: the release
  workflow used `npm publish` which does not resolve pnpm `workspace:` protocols,
  causing `@litmdx/core: "workspace:^"` to be written verbatim into the
  published `package.json`. Users installing `litmdx` outside a pnpm workspace
  got `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. Fixed by switching the release
  workflow to `pnpm publish --no-git-checks` and pinning `@litmdx/core` to
  `^0.1.3` in `packages/cli/package.json` so the resolved version is always
  written correctly on publish.

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
- `lib/navigation.ts` from template get update getRouteTitle function to prefer title over sidebar_label
 
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
