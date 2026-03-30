import type { Frontmatter, PageMetaMap } from './types';

export type FrontmatterGlobMap = Record<string, () => Promise<Frontmatter | undefined>>;

export async function loadPageMeta(loaders: FrontmatterGlobMap): Promise<PageMetaMap> {
  const results = await Promise.all(
    Object.entries(loaders).map(async ([key, load]) => {
      try {
        return { key, frontmatter: (await load()) ?? {} };
      } catch (error) {
        return { key, frontmatter: {}, error };
      }
    }),
  );

  const failed = results.filter(
    (result): result is { key: string; frontmatter: Frontmatter; error: unknown } =>
      'error' in result,
  );

  if (failed.length > 0) {
    console.error(
      `Failed to load frontmatter for ${failed.length} page(s): ${failed.map((result) => result.key).join(', ')}`,
      failed[0].error,
    );
  }

  return Object.fromEntries(results.map(({ key, frontmatter }) => [key, frontmatter]));
}
