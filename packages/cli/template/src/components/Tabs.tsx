import { memo, useState, Children, isValidElement, useId, useCallback } from 'react';
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
  const uid = useId().replace(/:/g, '');
  const tabs = Children.toArray(children).filter(
    (child): child is ReactElement<TabProps> =>
      isValidElement(child) &&
      (child.type === Tab || (child.type as { displayName?: string }).displayName === 'Tab'),
  );
  const [active, setActive] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActive((a) => (a + 1) % tabs.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive((a) => (a - 1 + tabs.length) % tabs.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActive(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActive(tabs.length - 1);
      }
    },
    [tabs.length],
  );

  if (tabs.length === 0) return null;

  return (
    <div className="tabs not-prose">
      <div className="tabs-list" role="tablist" aria-label="Tabs" onKeyDown={handleKeyDown}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            id={`${uid}-tab-${i}`}
            role="tab"
            aria-selected={i === active}
            aria-controls={`${uid}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`tabs-trigger ${i === active ? 'is-active' : ''}`}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div
        id={`${uid}-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${active}`}
        tabIndex={0}
        className="tabs-panel"
      >
        {tabs[active]}
      </div>
    </div>
  );
});
