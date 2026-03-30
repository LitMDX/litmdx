// Ambient type declarations for the LitMDX browser template.
// This file is picked up by tsconfig.template.json.

/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="vite/client" />

// ─── litmdx:config virtual module ─────────────────────────────────────────────
// Provided at runtime by the virtualConfigPlugin in packages/cli/src/vite/plugins/virtual-config.ts.

declare module 'litmdx:config' {
  import type { ResolvedConfig } from '@litmdx/core/config';
  const config: ResolvedConfig;
  export default config;
}
