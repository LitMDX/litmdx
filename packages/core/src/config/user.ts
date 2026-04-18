import type { ThemeAsset, HeadConfig, OpenGraphConfig } from './head.js';
import type { NavItem, FooterConfig } from './nav.js';
import type { ComponentsConfig } from './components.js';
import type { PluginsConfig } from './plugins.js';
import type { AgentConfig } from './agent.js';

export interface UserConfig {
  title?: string;
  description?: string;
  logo?: string | ThemeAsset; // URL/path or themed image variants
  baseUrl?: string;
  siteUrl?: string; // Canonical base URL for sitemap.xml, e.g. 'https://docs.example.com'
  nav?: NavItem[];
  docsDir?: string; // default: 'docs'
  head?: HeadConfig;
  openGraph?: OpenGraphConfig;
  footer?: FooterConfig;
  github?: string; // URL to the GitHub repository
  webmcp?: boolean; // enable WebMCP widget for AI agent integration
  components?: ComponentsConfig; // opt-in bundling for heavy built-in components
  plugins?: PluginsConfig;
  agent?: AgentConfig;
}
