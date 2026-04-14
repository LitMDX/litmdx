import { memo } from 'react';
import type { NavItem, Route, ThemeAsset, ThemeMode } from '../lib/types';
import { isNavItemActive } from '../lib/navigation';
import { Link } from '../components/Link';
import { withBaseUrl } from '../lib/urls';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title: string;
  logo: string | ThemeAsset | undefined;
  currentPath: string;
  routes: Route[];
  nav: NavItem[];
  github: string | undefined;
  showSidebarToggle: boolean;
  sidebarOpen: boolean;
  onNavigate: (path: string) => void;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

function renderLogo(logo: string | ThemeAsset | undefined, title: string) {
  if (!logo) return null;
  if (typeof logo === 'string') {
    return <img src={withBaseUrl(logo)} alt={title} className="app-brand-logo" decoding="async" />;
  }
  return (
    <span className="app-brand-logo-wrap">
      {logo.light && (
        <img
          src={withBaseUrl(logo.light)}
          alt={title}
          className="app-brand-logo app-brand-logo--light"
          decoding="async"
        />
      )}
      {logo.dark && (
        <img
          src={withBaseUrl(logo.dark)}
          alt=""
          aria-hidden="true"
          className="app-brand-logo app-brand-logo--dark"
          decoding="async"
        />
      )}
    </span>
  );
}

export const Header = memo(function Header({
  title,
  logo,
  currentPath,
  routes,
  nav,
  github,
  showSidebarToggle,
  sidebarOpen,
  onNavigate,
  onToggleSidebar,
  onOpenSearch,
  theme,
  onToggleTheme,
}: HeaderProps) {
  function renderNavItem(item: NavItem) {
    if (item.to) {
      const isActive = isNavItemActive(item, currentPath, routes);
      return (
        <Link
          key={`${item.label}-${item.to}`}
          href={item.to}
          className={`app-header-link ${isActive ? 'is-active' : ''}`}
          onNavigate={onNavigate}
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
          className="app-header-link"
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
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-brand">
          {showSidebarToggle ? (
            <button
              type="button"
              className="app-icon-button app-sidebar-toggle"
              onClick={onToggleSidebar}
              aria-controls="app-sidebar"
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={sidebarOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                {sidebarOpen ? (
                  <path d="M6 6 18 18M18 6 6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          ) : null}
          <div className="app-header-brand-copy">
            <Link href="/" className="app-brand-title" onNavigate={onNavigate}>
              {renderLogo(logo, title)}
              <span>{title}</span>
            </Link>
          </div>
        </div>

        <nav className="app-header-nav" aria-label="Top navigation">
          {nav.map(renderNavItem)}
        </nav>

        <div className="app-header-actions">
          <button
            type="button"
            className="search-trigger"
            onClick={onOpenSearch}
            aria-label="Search documentation"
          >
            <svg
              className="search-trigger-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="search-trigger-label">Search</span>
            <kbd className="search-trigger-kbd">⌘K</kbd>
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
      </div>
    </header>
  );
});
