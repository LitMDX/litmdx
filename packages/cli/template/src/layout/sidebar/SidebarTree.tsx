import { memo } from 'react';
import type { NavigateFn, PageMetaMap } from '../../lib/types';
import type { SidebarItem } from './types';
import { SidebarLink } from './SidebarLink';
import { SidebarGroup } from './SidebarGroup';

interface SidebarTreeProps {
  items: SidebarItem[];
  meta: PageMetaMap;
  currentPath: string;
  onNavigate: NavigateFn;
}

export const SidebarTree = memo(function SidebarTree({
  items,
  meta,
  currentPath,
  onNavigate,
}: SidebarTreeProps) {
  return (
    <nav className="sidebar-nav" aria-label="Sidebar">
      {items.map((item) =>
        item.kind === 'route' ? (
          <SidebarLink
            key={item.route.path}
            route={item.route}
            meta={meta}
            currentPath={currentPath}
            onNavigate={onNavigate}
          />
        ) : (
          <SidebarGroup
            key={`${item.label}-${item.defaultCollapsed}`}
            group={item}
            meta={meta}
            currentPath={currentPath}
            onNavigate={onNavigate}
          />
        ),
      )}
    </nav>
  );
});
