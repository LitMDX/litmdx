import { memo, useEffect, useState } from 'react';
import type { NavigateFn, PageMetaMap } from '../../lib/types';
import type { SidebarGroupItem } from './types';
import { SidebarLink } from './SidebarLink';

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
  const hasActiveRoute = group.routes.some((route) => currentPath === route.path);
  const [open, setOpen] = useState(() => hasActiveRoute || !(group.defaultCollapsed ?? true));

  useEffect(() => {
    if (hasActiveRoute) setOpen(true);
  }, [hasActiveRoute]);

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
          {group.routes.map((route) => (
            <SidebarLink
              key={route.path}
              route={route}
              meta={meta}
              currentPath={currentPath}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});
