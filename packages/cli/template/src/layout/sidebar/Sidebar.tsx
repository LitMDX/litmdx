import { memo } from 'react';
import { isNavItemActive, labelFromSegment } from '../../lib/navigation';
import type { NavigateFn, NavItem, PageMetaMap, Route } from '../../lib/types';
import { isMultiSectionMode } from '../../lib/router';
import { Link } from '../../components/Link';
import {
  buildSidebarItems,
  buildSectionItems,
  filterRoutesBySection,
  getActiveSection,
  getSectionHomeTarget,
} from './helpers';
import { SidebarTree } from './SidebarTree';

interface SidebarProps {
  title: string;
  routes: Route[];
  currentPath: string;
  meta: PageMetaMap;
  nav: NavItem[];
  github: string | undefined;
  onNavigate: NavigateFn;
}

export const Sidebar = memo(function Sidebar({
  title,
  routes,
  currentPath,
  meta,
  nav,
  github,
  onNavigate,
}: SidebarProps) {
  const multiSection = isMultiSectionMode(routes);
  const section = multiSection ? getActiveSection(currentPath, routes) : null;
  const visibleRoutes = multiSection ? filterRoutesBySection(routes, section) : routes;
  const items = section
    ? buildSectionItems(visibleRoutes, section, meta)
    : buildSidebarItems(visibleRoutes, meta);
  const sectionTitle = section ? labelFromSegment(section) : title;
  const homeTarget = section ? getSectionHomeTarget(routes, section) : '/';

  function renderNavItem(item: NavItem) {
    if (item.to) {
      const active = isNavItemActive(item, currentPath, routes);
      return (
        <Link
          key={`${item.label}-${item.to}`}
          href={item.to}
          className={`sidebar-mobile-nav-link ${active ? 'is-active' : ''}`}
          onNavigate={onNavigate}
          navigateOptions={{ preserveSidebarOpen: true }}
        >
          {item.label}
        </Link>
      );
    }

    if (item.href) {
      return (
        <a
          key={`${item.label}-${item.href}`}
          href={item.href}
          className="sidebar-mobile-nav-link"
          target="_blank"
          rel="noreferrer noopener"
        >
          {item.label}
        </a>
      );
    }

    return null;
  }

  return (
    <aside className="sidebar-shell">
      {multiSection ? (
        <div className="sidebar-brand">
          <Link
            href={homeTarget}
            className="sidebar-home"
            onNavigate={onNavigate}
            navigateOptions={{ preserveSidebarOpen: true }}
          >
            {sectionTitle}
          </Link>
        </div>
      ) : null}
      {nav.length > 0 || github ? (
        <div className="sidebar-mobile-nav" aria-label="Primary navigation">
          {nav.map(renderNavItem)}
          {github ? (
            <a
              href={github}
              className="sidebar-mobile-nav-link"
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub
            </a>
          ) : null}
        </div>
      ) : null}
      <SidebarTree items={items} meta={meta} currentPath={currentPath} onNavigate={onNavigate} />
    </aside>
  );
});
