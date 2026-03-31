import type { ReactNode } from 'react';

type CalloutType = 'note' | 'tip' | 'warning' | 'danger';

const icons: Record<CalloutType, ReactNode> = {
  note: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  tip: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a7 7 0 0 1 7 7c0 3-1.86 5.58-4.5 6.71V17a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-1.29C6.86 14.58 5 12 5 9a7 7 0 0 1 7-7z" />
      <line x1="9" y1="21" x2="15" y2="21" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  ),
  warning: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  danger: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

const config: Record<CalloutType, { themeClass: string; label: string }> = {
  note: { themeClass: 'callout-note', label: 'Note' },
  tip: { themeClass: 'callout-tip', label: 'Tip' },
  warning: { themeClass: 'callout-warning', label: 'Warning' },
  danger: { themeClass: 'callout-danger', label: 'Danger' },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

export function Callout({ type = 'note', title, children }: CalloutProps) {
  const { themeClass, label } = config[type];
  return (
    <div className={`callout not-prose ${themeClass}`}>
      <p className="callout-title">
        <span className="callout-icon" aria-hidden="true">
          {icons[type]}
        </span>
        {title ?? label}
      </p>
      <div className="callout-body">{children}</div>
    </div>
  );
}
