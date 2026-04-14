import type { Frontmatter } from './types';

/**
 * Builds the JSON-LD structured data object for a page.
 *
 * Auto-generates from `title`, `description`, and `schema_type` (default: "TechArticle").
 * Returns `undefined` when no `title` is available.
 */
export function buildPageSchema(
  frontmatter: Frontmatter | undefined,
): Record<string, unknown> | undefined {
  if (!frontmatter) return undefined;

  const headline = frontmatter.title;
  if (!headline) return undefined;

  const obj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': frontmatter.schema_type ?? 'WebPage',
    headline,
  };

  if (frontmatter.description) {
    obj.description = frontmatter.description;
  }

  return obj;
}
