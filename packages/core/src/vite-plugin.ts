import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeShiki from '@shikijs/rehype';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import type { ResolvedPlugins } from './config.js';
import { rawMdxPlugin } from './plugins/raw-mdx.js';

export function createVitePlugin(userPlugins?: ResolvedPlugins): Plugin[] {
  return [
    rawMdxPlugin(),
    ...(tailwindcss() as unknown as Plugin[]),
    mdx({
      remarkPlugins: [
        remarkFrontmatter,
        remarkMdxFrontmatter,
        remarkGfm,
        ...(userPlugins?.remarkPlugins ?? []),
      ],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        // Syntax highlighting at build time — zero client JS.
        // Uses dual-theme CSS variables so switching dark/light mode in Phase 3
        // only requires toggling a class on <html>, no re-render needed.
        [rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } }],
        ...(userPlugins?.rehypePlugins ?? []),
      ],
    }) as Plugin,
  ];
}
