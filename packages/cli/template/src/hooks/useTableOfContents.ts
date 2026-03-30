import { useEffect, useState } from 'react';
import type { TocItem } from '../lib/types';

export function useTableOfContents(article: HTMLElement | null, currentPath: string) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  useEffect(() => {
    if (!article) {
      return undefined;
    }

    let observer: IntersectionObserver | undefined;
    let frame = 0;

    const collectHeadings = () => {
      const headings = Array.from(article.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]'))
        .map((heading) => ({
          id: heading.id,
          text: heading.textContent?.trim() ?? '',
          level: heading.tagName === 'H2' ? 2 : 3,
        }))
        .filter((heading) => heading.id && heading.text) as TocItem[];

      setTocItems(headings);
      setActiveHeadingId(headings[0]?.id ?? '');

      observer?.disconnect();
      observer = undefined;

      if (headings.length === 0) {
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          if (visibleEntries[0]?.target.id) {
            setActiveHeadingId(visibleEntries[0].target.id);
          }
        },
        {
          rootMargin: '-104px 0px -68% 0px',
          threshold: [0, 1],
        },
      );

      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          observer?.observe(element);
        }
      });
    };

    const queueCollect = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(collectHeadings);
    };

    const mutationObserver = new MutationObserver(queueCollect);
    mutationObserver.observe(article, { childList: true, subtree: true });
    queueCollect();

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, [article, currentPath]);

  return { tocItems, activeHeadingId, setActiveHeadingId };
}
