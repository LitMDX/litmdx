import { memo } from 'react';
import { isNavItemActive, labelFromSegment } from '../../lib/navigation';
import type { NavigateFn, NavItem, PageMetaMap, Route, ThemeMode } from '../../lib/types';
import { isMultiSectionMode } from '../../lib/router';
import { Link } from '../../components/Link';
import { ThemeToggle } from '../ThemeToggle';
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
  onOpenSearch: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Sidebar = memo(function Sidebar({
  title,
  routes,
  currentPath,
  meta,
  nav,
  github,
  onNavigate,
  onOpenSearch,
  theme,
  onToggleTheme,
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
      <div className="sidebar-mobile-actions">
        <button
          type="button"
          className="app-icon-button"
          onClick={onOpenSearch}
          aria-label="Search documentation"
          title="Search documentation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        {github ? (
          <a
            href={github}
            className="app-icon-button"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub repository"
            title="GitHub repository"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.75 2.69 1.24 3.35.95.1-.75.4-1.24.73-1.53-2.56-.29-5.26-1.28-5.26-5.72 0-1.26.45-2.3 1.19-3.12-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.18 1.19a10.9 10.9 0 0 1 5.8 0c2.2-1.5 3.17-1.19 3.17-1.19.63 1.6.23 2.78.11 3.07.74.82 1.19 1.86 1.19 3.12 0 4.45-2.7 5.42-5.28 5.71.41.35.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
          </a>
        ) : null}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      {nav.length > 0 ? (
        <div className="sidebar-mobile-nav" aria-label="Primary navigation">
          {nav.map(renderNavItem)}
        </div>
      ) : null}
      <SidebarTree items={items} meta={meta} currentPath={currentPath} onNavigate={onNavigate} />
    </aside>
  );
});
