import { memo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useCopyAction } from '../hooks/useCopyAction';

interface CodeBlockProps {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export const CodeBlock = memo(function CodeBlock({ children, className, ...rest }: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copyState, triggerCopy] = useCopyAction(async () => {
    const text = preRef.current?.textContent ?? '';
    await navigator.clipboard.writeText(text);
  });

  const copied = copyState === 'copied';

  return (
    <div className="code-block-wrapper">
      <button
        type="button"
        className={`code-block-copy${copied ? ' is-copied' : ''}`}
        onClick={triggerCopy}
        aria-label={copied ? 'Copied!' : 'Copy code'}
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <pre ref={preRef} className={className} {...rest}>
        {children}
      </pre>
    </div>
  );
});
