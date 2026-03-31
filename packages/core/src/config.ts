export interface NavItem {
  label: string;
  to?: string; // internal route
  href?: string; // external link
}

export interface FooterConfig {
  description?: string;
}

export interface ThemeAsset {
  light?: string;
  dark?: string;
}

export interface HeadConfig {
  favicon?: string | ThemeAsset; // <link rel="icon" href="..." />
  lang?: string; // <html lang="..."> — default: 'en'
  author?: string; // <meta name="author" />
  themeColor?: string; // <meta name="theme-color" />
  keywords?: string[]; // <meta name="keywords" />
}

export interface OpenGraphConfig {
  image?: string; // absolute URL to default OG image
  twitterCard?: 'summary' | 'summary_large_image';
  twitterSite?: string; // @handle for twitter:site
  locale?: string; // og:locale — default: 'en_US'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any;

export interface ComponentsConfig {
  mermaid?: boolean; // enable Mermaid diagram support — default: false (opt-in)
}

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
  plugins?: {
    remarkPlugins?: AnyPlugin[];
    rehypePlugins?: AnyPlugin[];
  };
}

export interface ResolvedPlugins {
  remarkPlugins: AnyPlugin[];
  rehypePlugins: AnyPlugin[];
}

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
}

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
  };
}
