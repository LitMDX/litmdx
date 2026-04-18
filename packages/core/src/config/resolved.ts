import type { ThemeAsset, HeadConfig, OpenGraphConfig } from './head.js';
import type { NavItem, FooterConfig } from './nav.js';
import type { ResolvedPlugins } from './plugins.js';
import type { ResolvedAgentConfig } from './agent.js';

export interface ResolvedConfig {
  title: string;
  description: string;
  logo: string | ThemeAsset | undefined;
  baseUrl: string;
  siteUrl: string | undefined;
  nav: NavItem[];
  docsDir: string;
  head: HeadConfig;
  openGraph: OpenGraphConfig;
  footer: FooterConfig;
  github: string | undefined;
  webmcp: boolean;
  components: { mermaid: boolean };
  plugins: ResolvedPlugins;
  agent: ResolvedAgentConfig | undefined;
}
