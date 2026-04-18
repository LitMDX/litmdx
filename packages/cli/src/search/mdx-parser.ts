/**
 * Pure MDX content parser shared by the docs-index and pagefind indexers.
 *
 * Responsibilities (single):
 *   - Extract frontmatter fields (title, description)
 *   - Strip code blocks, JSX components, markdown syntax
 *   - Preserve the original raw source
 *
 * No file I/O, no route computation — callers own those concerns.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedMdx {
  title: string;
  description: string;
  /** Cleaned prose — no MDX/JSX/code-block syntax */
  content: string;
  /** Original .mdx source (kept for agent's get_page tool) */
  raw: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Parses an MDX source string into a `ParsedMdx` object.
 *
 * Stripping order matters:
 *   1. Code blocks first — prevents JSX tags inside fences from confusing
 *      the block-level JSX regex (Bug #1 fix).
 *   2. Imports/exports
 *   3. Block-level JSX with `^` line anchor — prevents table-cell tag
 *      references from being treated as block openers (Bug #2 fix).
 *   4. Inline JSX remnants
 *   5. Markdown syntax
 *
 * @param source      Raw file content.
 * @param fallbackName Used as `title` when neither frontmatter nor H1 supplies one.
 */
export function parseMdxSource(source: string, fallbackName = 'Untitled'): ParsedMdx {
  let title = '';
  let description = '';
  let body = source;

  // 1. Extract frontmatter ─────────────────────────────────────────────────
  const fmMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const titleMatch = fm.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
    const descMatch = fm.match(/^description:\s*['"]?(.+?)['"]?\s*$/m);
    if (titleMatch) title = titleMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
    body = source.slice(fmMatch[0].length).trim();
  }

  // 2. Strip fenced code blocks (backreference handles 4-tick wrapping 3-tick)
  body = body.replace(/^(`{3,})[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm, '');

  // 3. Strip import / export statements
  body = body.replace(/^(import|export\s+(?:default\s+)?)[^\n]*\n?/gm, '');

  // 4a. Strip block-level JSX: <Component>...</Component>
  //     `^` anchor ensures only tags that START a line are matched, so inline
  //     references inside table cells (e.g. `| <Mermaid> |`) are ignored here.
  body = body.replace(/^<([A-Z][A-Za-z0-9.]*)(\s[^>]*)?>[\s\S]*?<\/\1>/gm, '');

  // 4b. Strip block-level self-closing JSX: <Component />
  body = body.replace(/^<[A-Z][A-Za-z0-9.]*(?:\s[^>]*)?\s*\/>/gm, '');

  // 4c. Strip residual inline JSX tags (e.g. inside table cells)
  body = body.replace(/<\/?[A-Z][A-Za-z0-9.]*(?:\s[^>]*)?>/g, '');

  // 5. Strip markdown syntax; capture first H1 as title fallback ────────────
  body = body
    .replace(/^#{1,6}\s+(.*)/gm, (_, t) => {
      if (!title) title = t.trim();
      return t;
    })
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^---+$/gm, '')
    .trim();

  return {
    title: title || fallbackName,
    description,
    content: body,
    raw: source,
  };
}
