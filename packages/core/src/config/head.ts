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
