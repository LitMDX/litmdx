import { useState, Children, isValidElement } from 'react';
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

  // Children are rendered <pre> blocks from Shiki.
  const blocks = Children.toArray(children).filter((child): child is ReactElement =>
    isValidElement(child),
  );

  if (blocks.length === 0) return null;

  return (
    <div className="code-group not-prose">
      <div className="code-group-tabs">
        {blocks.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`code-group-trigger ${i === active ? 'is-active' : ''}`}
          >
            {labels[i] ?? `Code ${i + 1}`}
          </button>
        ))}
      </div>
      <div className="code-group-panel">{blocks[active]}</div>
    </div>
  );
}
