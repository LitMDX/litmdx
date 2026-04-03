import path from 'path';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { walkMdx, fileToImportKey } from '../../utils/fs.js';

type GeneratedFrontmatter = {
  title?: string;
  description?: string;
  sidebar_position?: number;
  sidebar_label?: string;
  sidebar_collapsed?: boolean;
  sidebar_hidden?: boolean;
};

function parseFrontmatterValue(rawValue: string): string | number | boolean {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value === 'true') return true;
  if (value === 'false') return false;

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function extractFrontmatter(source: string): GeneratedFrontmatter {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {};
  }

  const allowedKeys = new Set([
    'title',
    'description',
    'sidebar_position',
    'sidebar_label',
    'sidebar_collapsed',
    'sidebar_hidden',
  ]);
  const frontmatter: GeneratedFrontmatter = {};

  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
    if (!entry) {
      continue;
    }

    const [, key, rawValue] = entry;
    if (!allowedKeys.has(key)) {
      continue;
    }

    frontmatter[key as keyof GeneratedFrontmatter] = parseFrontmatterValue(rawValue) as never;
  }

  return frontmatter;
}

export function writeGeneratedPageMeta(litmdxDir: string, docsDir: string): string {
  const generatedDir = path.join(litmdxDir, 'src', 'generated');
  const outputPath = path.join(generatedDir, 'page-meta.ts');
  const pageMeta = Object.fromEntries(
    walkMdx(docsDir).map((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return [fileToImportKey(filePath, docsDir), extractFrontmatter(source)];
    }),
  );

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(
    outputPath,
    `export const pageMeta = ${JSON.stringify(pageMeta, null, 2)} as const;\n`,
  );

  return outputPath;
}
