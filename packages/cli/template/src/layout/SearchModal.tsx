import { memo, useCallback, useEffect, useRef } from 'react';
import type { SearchResult } from '../hooks/useSearch';

interface SearchModalProps {
  open: boolean;
  query: string;
  results: SearchResult[];
  loading: boolean;
  onSearch: (term: string) => void;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const SearchModal = memo(function SearchModal({
  open,
  query,
  results,
  loading,
  onSearch,
  onClose,
  onNavigate,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(-1);

  // Focus input on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      activeIndexRef.current = -1;
    }
  }, [open]);

  const navigateTo = useCallback(
    (url: string) => {
      onClose();
      // Strip base path if needed
      const path = url.startsWith('/') ? url : `/${url}`;
      onNavigate(path);
    },
    [onClose, onNavigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = listRef.current?.querySelectorAll<HTMLButtonElement>('.search-result-item');
      if (!items?.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndexRef.current = Math.min(activeIndexRef.current + 1, items.length - 1);
        items[activeIndexRef.current]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
        if (activeIndexRef.current === 0 && e.currentTarget === items[0]) {
          inputRef.current?.focus();
          activeIndexRef.current = -1;
        } else {
          items[activeIndexRef.current]?.focus();
        }
      } else if (e.key === 'Enter' && activeIndexRef.current >= 0) {
        e.preventDefault();
        const url = items[activeIndexRef.current]?.dataset.url;
        if (url) navigateTo(url);
      }
    },
    [navigateTo],
  );

  if (!open) return null;

  return (
    <div className="search-overlay" onClick={onClose} role="presentation">
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="search-input-wrapper">
          <svg
            className="search-input-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search documentation…"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search documentation"
          />
          <button
            type="button"
            className="search-close-btn"
            onClick={onClose}
            aria-label="Close search"
          >
            <span className="search-close-esc" aria-hidden="true">
              Esc
            </span>
            <svg
              className="search-close-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="search-results" ref={listRef} aria-label="Search results">
          <div role="status" aria-live="polite" aria-atomic="true" className="app-visually-hidden">
            {!loading && query
              ? results.length === 0
                ? `No results for "${query}"`
                : `${results.length} result${results.length === 1 ? '' : 's'} found`
              : ''}
          </div>
          {loading && query ? (
            <div className="search-status">Searching…</div>
          ) : query && results.length === 0 ? (
            <div className="search-status">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.url}-${i}`}
                type="button"
                className="search-result-item"
                data-url={result.url}
                onClick={() => navigateTo(result.url)}
                tabIndex={0}
              >
                <span className="search-result-title">{result.title}</span>
                <span
                  className="search-result-excerpt"
                  dangerouslySetInnerHTML={{ __html: result.excerpt }}
                />
              </button>
            ))
          )}
        </div>

        {!query ? (
          <div className="search-footer">
            <span className="search-footer-hint">
              <kbd className="search-kbd-inline">↑</kbd>
              <kbd className="search-kbd-inline">↓</kbd> to navigate
            </span>
            <span className="search-footer-hint">
              <kbd className="search-kbd-inline">Enter</kbd> to select
            </span>
            <span className="search-footer-hint">
              <kbd className="search-kbd-inline">Esc</kbd> to close
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
});
