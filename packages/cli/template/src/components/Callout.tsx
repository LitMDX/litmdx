import type { ReactNode } from 'react';

type CalloutType = 'note' | 'tip' | 'warning' | 'danger';

const config: Record<CalloutType, { themeClass: string; label: string; icon: string }> = {
  note: {
    themeClass: 'callout-note',
    label: 'Note',
    icon: 'i',
  },
  tip: {
    themeClass: 'callout-tip',
    label: 'Tip',
    icon: '+',
  },
  warning: {
    themeClass: 'callout-warning',
    label: 'Warning',
    icon: '!',
  },
  danger: {
    themeClass: 'callout-danger',
    label: 'Danger',
    icon: 'x',
  },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

export function Callout({ type = 'note', title, children }: CalloutProps) {
  const { themeClass, label, icon } = config[type];
  return (
    <div className={`callout not-prose ${themeClass}`}>
      <p className="callout-title">
        <span className="callout-icon" aria-hidden="true">
          {icon}
        </span>
        {title ?? label}
      </p>
      <div className="callout-body">{children}</div>
    </div>
  );
}
