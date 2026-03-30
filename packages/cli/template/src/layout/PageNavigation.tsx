import { memo } from 'react';
import { getRouteTitle } from '../lib/navigation';
import type { PageMetaMap, Route } from '../lib/types';
import { Link } from '../components/Link';

interface PageNavigationProps {
  previousRoute: Route | undefined;
  nextRoute: Route | undefined;
  meta: PageMetaMap;
  onNavigate: (path: string) => void;
}

export const PageNavigation = memo(function PageNavigation({
  previousRoute,
  nextRoute,
  meta,
  onNavigate,
}: PageNavigationProps) {
  if (!previousRoute && !nextRoute) {
    return null;
  }

  return (
    <nav className="app-page-nav" aria-label="Page navigation">
      {previousRoute ? (
        <Link href={previousRoute.path} className="app-page-nav-link" onNavigate={onNavigate}>
          <span className="app-page-nav-eyebrow">Previous</span>
          <span className="app-page-nav-title">{getRouteTitle(previousRoute, meta)}</span>
        </Link>
      ) : (
        <div />
      )}

      {nextRoute ? (
        <Link href={nextRoute.path} className="app-page-nav-link is-next" onNavigate={onNavigate}>
          <span className="app-page-nav-eyebrow">Next</span>
          <span className="app-page-nav-title">{getRouteTitle(nextRoute, meta)}</span>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
});
