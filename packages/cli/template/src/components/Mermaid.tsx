import { useEffect, useRef, useState, isValidElement } from 'react';
import type { ReactNode } from 'react';

interface MermaidProps {
  children: ReactNode;
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
    return extractText(node.props.children as ReactNode);
  }
  return '';
}

let counter = 0;

export function Mermaid({ children }: MermaidProps) {
  const id = useRef(`mermaid-${++counter}`).current;
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark'),
  );

  // Extract plain text once per render — string is compared by value in the dep array.
  const definition = extractText(children).trim();

  // Watch only class changes on <html> to detect theme switches.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Re-render the diagram only when the definition string or theme actually changes.
  useEffect(() => {
    if (!definition) return;
    let cancelled = false;

    import('mermaid')
      .then(({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        // Unique id per theme so mermaid doesn't return a same-id cached SVG.
        const renderId = `${id}-${isDark ? 'd' : 'l'}`;
        return mermaid.render(renderId, definition);
      })
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [definition, isDark]); // ← string comparisons, not ReactNode references

  if (error) {
    return (
      <div className="mermaid-error not-prose">
        <p className="mermaid-error-label">Diagram error</p>
        <pre className="mermaid-error-pre">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return <div className="mermaid-skeleton not-prose" aria-hidden="true" />;
  }

  return <div className="mermaid not-prose" dangerouslySetInnerHTML={{ __html: svg }} />;
}
