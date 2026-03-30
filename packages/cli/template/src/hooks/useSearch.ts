import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizePathname, stripBaseUrl, withBaseUrl } from '../lib/urls';

export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pagefind: any = null;
const PAGEFIND_PATH = withBaseUrl('/pagefind/pagefind.js');

export function normalizeSearchResultUrl(url: string, baseUrl?: string): string {
  const pathname = normalizePathname(stripBaseUrl(url, baseUrl));

  if (pathname === '/home') {
    return '/';
  }

  if (pathname.startsWith('/home/')) {
    return normalizePathname(pathname.slice('/home'.length));
  }

  return pathname;
}

async function loadPagefind() {
  if (pagefind) return pagefind;
  try {
    pagefind = await import(/* @vite-ignore */ PAGEFIND_PATH);
    await pagefind.init();
  } catch {
    // Pagefind index not available (dev mode or first build)
    pagefind = null;
  }
  return pagefind;
}

export function useSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(0);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (term: string) => {
    setQuery(term);
    if (!term.trim()) {
      setResults([]);
      return;
    }

    const id = ++abortRef.current;
    setLoading(true);

    const pf = await loadPagefind();
    if (!pf || id !== abortRef.current) {
      setLoading(false);
      return;
    }

    const response = await pf.debouncedSearch(term, {}, 150);
    if (!response || id !== abortRef.current) {
      setLoading(false);
      return;
    }

    const data = await Promise.all(
      response.results.slice(0, 8).map((r: { data: () => Promise<SearchResult> }) => r.data()),
    );
    if (id !== abortRef.current) return;

    setResults(
      data.map((d: { url: string; meta: { title?: string }; excerpt: string }) => ({
        url: normalizeSearchResultUrl(d.url),
        title: d.meta?.title ?? '',
        excerpt: d.excerpt,
      })),
    );
    setLoading(false);
  }, []);

  return { open, setOpen, query, search, results, loading };
}
