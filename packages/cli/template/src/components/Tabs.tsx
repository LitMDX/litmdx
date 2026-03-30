import { memo, useState, Children, isValidElement } from 'react';
import type { ReactNode, ReactElement } from 'react';

interface TabProps {
  label: string;
  children: ReactNode;
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

Tab.displayName = 'Tab';

interface TabsProps {
  children: ReactNode;
}

export const Tabs = memo(function Tabs({ children }: TabsProps) {
  const tabs = Children.toArray(children).filter(
    (child): child is ReactElement<TabProps> =>
      isValidElement(child) &&
      (child.type === Tab || (child.type as { displayName?: string }).displayName === 'Tab'),
  );
  const [active, setActive] = useState(0);

  if (tabs.length === 0) return null;

  return (
    <div className="tabs not-prose">
      <div className="tabs-list" role="tablist" aria-label="Tabs">
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`tabs-trigger ${i === active ? 'is-active' : ''}`}
            role="tab"
            aria-selected={i === active}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="tabs-panel">{tabs[active]}</div>
    </div>
  );
});
