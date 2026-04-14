import { defineConfig } from '@litmdx/core';

export default defineConfig({
  title: 'LitMDX',
  description: 'LitMDX is an open-source documentation framework built on React, MDX, and Vite. Zero-config, fast full-text search, SSG, and WebMCP support out of the box.',
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  },
  github: 'https://github.com/LitMDX/litmdx',
  siteUrl: 'https://litmdx.dev',
  webmcp: true,

  components: {
    mermaid: true,
  },

  head: {
    favicon: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
    },
    lang: 'en',
    author: 'LitMDX',
    themeColor: '#6366f1',
    keywords: [
      'litmdx',
      'mdx',
      'documentation',
      'react',
      'vite',
      'open source',
      'docs framework',
      'static site generator',
      'mdx documentation',
      'react documentation',
      'developer docs',
    ],
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
