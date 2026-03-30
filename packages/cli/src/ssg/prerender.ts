import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { build } from 'vite';
import type { BuildOptions, InlineConfig } from 'vite';
import { injectStaticMarkup, routeToOutputPath } from './helpers.js';
import type { PrerenderHead } from './helpers.js';

interface StaticRenderModule {
  getStaticRoutes(): Promise<string[]>;
  renderStaticRoute(pathname: string): Promise<{ html: string; head: PrerenderHead }>;
}

export async function prerenderStaticRoutes(root: string, viteConfig: InlineConfig): Promise<void> {
  const litmdxDir = String(viteConfig.root);
  const outDir = String(
    (viteConfig.build as BuildOptions | undefined)?.outDir ?? path.join(root, 'dist'),
  );
  const ssgOutDir = path.join(root, '.litmdx-ssr');
  const ssgEntry = path.join(litmdxDir, 'src', 'ssg', 'index.tsx');

  try {
    await build({
      ...viteConfig,
      build: {
        ...(viteConfig.build as BuildOptions | undefined),
        ssr: ssgEntry,
        outDir: ssgOutDir,
        emptyOutDir: true,
        minify: false,
        rollupOptions: {
          output: {
            entryFileNames: 'ssg.js',
            format: 'es',
          },
        },
      },
    });

    const entryPath = path.join(ssgOutDir, 'ssg.js');
    const entryUrl = `${pathToFileURL(entryPath).href}?t=${Date.now()}`;
    const mod = (await import(entryUrl)) as StaticRenderModule;
    const routes = await mod.getStaticRoutes();
    const template = readFileSync(path.join(outDir, 'index.html'), 'utf8');

    for (const route of routes) {
      const rendered = await mod.renderStaticRoute(route);
      const outputPath = routeToOutputPath(outDir, route);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, injectStaticMarkup(template, rendered.html, rendered.head), 'utf8');
    }

    console.log(`  ✓ prerendered ${routes.length} static routes`);
  } finally {
    rmSync(ssgOutDir, { recursive: true, force: true });
  }
}
