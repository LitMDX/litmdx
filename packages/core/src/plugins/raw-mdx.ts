import { readFileSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

// The \0 prefix is the Rollup convention for virtual modules. @mdx-js/rollup uses
// createFilter() from @rollup/pluginutils which automatically excludes \0-prefixed IDs,
// so this plugin's loaded modules will never be re-transformed by the MDX plugin.
const RAW_MDX_PREFIX = '\0litmdx-raw:';

export function rawMdxPlugin(): Plugin {
  // In-memory cache to avoid repeated readFileSync calls during dev server.
  // Keyed by absolute file path; cleared by handleHotUpdate on file change.
  const cache = new Map<string, string>();

  return {
    name: 'litmdx-raw-mdx',
    enforce: 'pre',
    resolveId(id: string, importer?: string) {
      const qIdx = id.indexOf('?');
      if (qIdx === -1) return;
      const filePart = id.slice(0, qIdx);
      const query = id.slice(qIdx + 1);

      // URLSearchParams handles ?raw, ?raw&t=12345 (Vite HMR timestamp), etc.
      if (!new URLSearchParams(query).has('raw')) return;
      if (!filePart.endsWith('.mdx') && !filePart.endsWith('.md')) return;

      const absolutePath = path.isAbsolute(filePart)
        ? filePart
        : importer
          ? path.resolve(path.dirname(importer.split('?')[0]), filePart)
          : undefined;

      if (!absolutePath) return;
      return RAW_MDX_PREFIX + absolutePath;
    },
    load(id: string) {
      if (!id.startsWith(RAW_MDX_PREFIX)) return;
      const filePath = id.slice(RAW_MDX_PREFIX.length);

      const cached = cache.get(filePath);
      if (cached !== undefined) return cached;

      this.addWatchFile(filePath);
      const content = readFileSync(filePath, 'utf-8');
      const code = `export default ${JSON.stringify(content)}`;
      cache.set(filePath, code);
      return code;
    },
    handleHotUpdate({ file, server }) {
      if (!cache.has(file)) return;
      cache.delete(file);
      const mod = server.moduleGraph.getModuleById(RAW_MDX_PREFIX + file);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
