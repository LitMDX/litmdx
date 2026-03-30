import { build } from 'vite';
import { buildViteConfig, loadUserConfig } from '../vite/index.js';
import { buildPagefindIndex } from '../search/pagefind-index.js';
import { buildSitemap } from '../sitemap/build.js';
import { prerenderStaticRoutes } from '../ssg/prerender.js';
import { resolveConfig } from '@litmdx/core/config';
import path from 'path';

export async function buildCommand(root: string): Promise<void> {
  console.log('\n  litmdx building...\n');
  const userConfig = await loadUserConfig(root);
  const config = resolveConfig(userConfig);
  const viteConfig = await buildViteConfig(root, 'build', undefined, userConfig);
  await build(viteConfig);
  await prerenderStaticRoutes(root, viteConfig);

  const outDir = (viteConfig.build?.outDir as string) ?? path.join(root, 'dist');
  const docsDir = path.resolve(root, config.docsDir);
  try {
    await buildPagefindIndex(docsDir, outDir);
  } catch (err) {
    console.warn(`\n  ⚠ pagefind indexing failed: ${err}\n`);
  }

  if (config.siteUrl) {
    try {
      await buildSitemap(docsDir, outDir, config.siteUrl, config.baseUrl);
    } catch (err) {
      console.warn(`\n  ⚠ sitemap generation failed: ${err}\n`);
    }
  }

  console.log('\n  litmdx build complete.\n');
}
