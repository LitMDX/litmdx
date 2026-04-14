import { useState, Children, isValidElement, useId, useCallback } from 'react';
import type { ReactNode, ReactElement } from 'react';

interface CodeGroupProps {
  /** Labels for each code block tab, in order. Defaults to "Code N". */
  labels?: string[];
  children: ReactNode;
}

/**
 * Groups multiple code blocks under labeled tabs.
 *
 * @example
 * <CodeGroup labels={["npm", "pnpm", "bun"]}>
 * ```bash
 * npm install litmdx
 * ```
 * ```bash
 * pnpm add litmdx
 * ```
 * ```bash
 * bun add litmdx
 * ```
 * </CodeGroup>
 */
export function CodeGroup({ children, labels = [] }: CodeGroupProps) {
  const [active, setActive] = useState(0);
  const uid = useId().replace(/:/g, '');

  // Children are rendered <pre> blocks from Shiki.
  const blocks = Children.toArray(children).filter((child): child is ReactElement =>
    isValidElement(child),
  );

  if (blocks.length === 0) return null;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActive((a) => (a + 1) % blocks.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive((a) => (a - 1 + blocks.length) % blocks.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActive(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActive(blocks.length - 1);
      }
    },
    [blocks.length],
  );

  return (
    <div className="code-group not-prose">
      <div
        className="code-group-tabs"
        role="tablist"
        aria-label="Code examples"
        onKeyDown={handleKeyDown}
      >
        {blocks.map((_, i) => (
          <button
            key={i}
            type="button"
            id={`${uid}-tab-${i}`}
            role="tab"
            aria-selected={i === active}
            aria-controls={`${uid}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`code-group-trigger ${i === active ? 'is-active' : ''}`}
          >
            {labels[i] ?? `Code ${i + 1}`}
          </button>
        ))}
      </div>
      <div
        id={`${uid}-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${active}`}
        tabIndex={0}
        className="code-group-panel"
      >
        {blocks[active]}
      </div>
    </div>
  );
}
