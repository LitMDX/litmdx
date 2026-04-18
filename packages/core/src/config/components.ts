/**
 * Controls which heavy built-in components LitMDX includes in the bundle.
 *
 * By default, only lightweight components (Callout, Tabs, Steps, Card, Badge,
 * CodeGroup) are always present. A component qualifies as **opt-in** when it
 * meets at least one of these criteria:
 *
 *   1. Adds > 50 KB (gzip) to the initial JS payload, OR
 *   2. Requires > 5 additional lazy-loaded chunks, OR
 *   3. Is rarely needed — irrelevant for the majority of documentation sites.
 *
 * Opt-in components are excluded from `builtInComponents` unless explicitly
 * enabled. This keeps the default bundle small without requiring any manual
 * tree-shaking from the user.
 *
 * Current opt-in components:
 *
 * | Key       | Component   | ~Cost (gzip) | Chunks | Reason                              |
 * |-----------|-------------|-------------|--------|-------------------------------------|
 * | `mermaid` | `<Mermaid>` | ~500 KB     | 1 *    | mermaid + d3 + dagre + cytoscape    |
 *
 * (*) When enabled, LitMDX consolidates all Mermaid sub-packages into a single
 * lazily-loaded `mermaid.[hash].js` chunk for efficient browser caching.
 *
 * To add a new opt-in component, see `writeGeneratedBuiltInComponents` in
 * `packages/cli/src/vite/prepare/generated-components.ts`.
 */
export interface ComponentsConfig {
  mermaid?: boolean; // enable Mermaid diagram support — default: false (opt-in)
}
