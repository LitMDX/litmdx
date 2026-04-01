import { memo, useEffect, useState } from 'react';
import type { NavigateFn, PageMetaMap } from '../../lib/types';
import type { SidebarGroupItem, SidebarItem } from './types';
import { SidebarLink } from './SidebarLink';

function hasActiveItem(items: SidebarItem[], path: string): boolean {
  return items.some((item) =>
    item.kind === 'route' ? item.route.path === path : hasActiveItem(item.items, path),
  );
}

interface SidebarGroupProps {
  group: SidebarGroupItem;
  meta: PageMetaMap;
  currentPath: string;
  onNavigate: NavigateFn;
}

export const SidebarGroup = memo(function SidebarGroup({
  group,
  meta,
  currentPath,
  onNavigate,
}: SidebarGroupProps) {
  const isActive = hasActiveItem(group.items, currentPath);
  const [open, setOpen] = useState(() => isActive || !(group.defaultCollapsed ?? true));

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div className={`sidebar-group ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="sidebar-group-trigger"
        aria-expanded={open}
      >
        <span className="sidebar-group-label">{group.label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`sidebar-group-icon ${open ? 'is-open' : ''}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div className="sidebar-group-links" role="group" aria-label={group.label}>
          {group.items.map((item) =>
            item.kind === 'route' ? (
              <SidebarLink
                key={item.route.path}
                route={item.route}
                meta={meta}
                currentPath={currentPath}
                onNavigate={onNavigate}
                indent
              />
            ) : (
              <SidebarGroup
                key={item.label}
                group={item}
                meta={meta}
                currentPath={currentPath}
                onNavigate={onNavigate}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
});
