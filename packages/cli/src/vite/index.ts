// Public entry point for the vite/ module.
// Re-exports buildViteConfig so that commands.ts does not depend on the
// internal structure of this directory.

export { buildViteConfig, loadUserConfig } from './config.js';
