import { memo } from 'react';
import type { TocItem } from '../lib/types';

interface TableOfContentsProps {
  items: TocItem[];
  activeHeadingId: string;
  onActivate: (id: string) => void;
  variant?: 'inline' | 'rail';
}

export const TableOfContents = memo(function TableOfContents({
  items,
  activeHeadingId,
  onActivate,
  variant = 'rail',
}: TableOfContentsProps) {
  function scrollToHeading(id: string) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    const header = document.querySelector<HTMLElement>('.app-header');
    const headerOffset = header ? header.getBoundingClientRect().height : 0;
    const spacingOffset = 16;
    const top = window.scrollY + element.getBoundingClientRect().top - headerOffset - spacingOffset;

    onActivate(id);
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    window.history.replaceState(null, '', `#${id}`);
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className={`app-toc app-toc-${variant}`}>
      <div className="app-toc-panel">
        <p className="app-toc-title">On this page</p>
        <nav className="app-toc-links" aria-label="Table of contents">
          {items.map((item) => (
            <a
              key={`${variant}-${item.id}`}
              href={`#${item.id}`}
              className={`app-toc-link level-${item.level} ${activeHeadingId === item.id ? 'is-active' : ''}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToHeading(item.id);
              }}
            >
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
});
