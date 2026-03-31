import { defineConfig } from '@litmdx/core';

export default defineConfig({
  title: 'LitMDX',
  description: 'Fast, modern documentation built on React + MDX',
  logo: {
    light: '/logo-light.png',
    dark: '/logo-dark.png',
  },
  github: 'https://github.com/LitMDX/litmdx',
  siteUrl: 'https://litmdx.dev',
  webmcp: true,

  components: {
    mermaid: true,
  },

  head: {
    favicon: {
      light: '/logo-light.png',
      dark: '/logo-dark.png',
    },
    lang: 'en',
    author: 'LitMDX',
    themeColor: '#6366f1',
    keywords: ['documentation', 'react', 'mdx', 'vite'],
  },

  openGraph: {
    image: 'https://litmdx.dev/og.png',
    twitterCard: 'summary_large_image',
    twitterSite: '@litmdx',
    locale: 'en_US',
  },

  footer: {
    description: '© 2026 LitMDX. All rights reserved.',
  },

  nav: [
    { label: 'Home', to: '/' },
    { label: 'Reference', to: '/reference' },
  ],
});
