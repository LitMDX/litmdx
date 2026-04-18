import { defineConfig } from '@litmdx/core';

export default defineConfig({
  title: 'LitMDX',
  description: 'LitMDX is an open-source documentation framework built on React, MDX, and Vite. Zero-config, fast full-text search, SSG, and WebMCP support out of the box.',
  github: process.env['LITMDX_GITHUB_URL'],
  siteUrl: process.env['LITMDX_SITE_URL'],
  webmcp: true,

  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  },

  agent: {
    enabled: true,
    name: 'LitMDX Docs Assistant',
    serverUrl: process.env['LITMDX_AGENT_URL'],
  },

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
      'markdown documentation',
      'markdown'
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
