import type { UserConfig } from './user.js';
import type { ResolvedConfig } from './resolved.js';
import { resolveAgentConfig } from './agent.js';

export function resolveConfig(user: UserConfig = {}): ResolvedConfig {
  return {
    title: user.title ?? 'LitMDX Docs',
    description: user.description ?? '',
    logo: user.logo,
    baseUrl: user.baseUrl ?? '/',
    siteUrl: user.siteUrl,
    nav: user.nav ?? [],
    docsDir: user.docsDir ?? 'docs',
    head: user.head ?? {},
    openGraph: user.openGraph ?? {},
    footer: user.footer ?? {},
    github: user.github,
    webmcp: user.webmcp ?? false,
    components: {
      mermaid: user.components?.mermaid ?? false,
    },
    plugins: {
      remarkPlugins: user.plugins?.remarkPlugins ?? [],
      rehypePlugins: user.plugins?.rehypePlugins ?? [],
    },
    agent: user.agent?.enabled ? resolveAgentConfig(user.agent) : undefined,
  };
}
