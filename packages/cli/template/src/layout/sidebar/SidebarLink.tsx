import { memo } from 'react';
import type { NavigateFn, PageMetaMap, Route } from '../../lib/types';
import { getSidebarLabel } from './helpers';
import { Link } from '../../components/Link';

interface SidebarLinkProps {
  route: Route;
  meta: PageMetaMap;
  currentPath: string;
  onNavigate: NavigateFn;
  indent?: boolean;
}

export const SidebarLink = memo(function SidebarLink({
  route,
  meta,
  currentPath,
  onNavigate,
  indent,
}: SidebarLinkProps) {
  const isActive = currentPath === route.path;

  return (
    <Link
      href={route.path}
      onNavigate={onNavigate}
      className={`sidebar-link ${indent ? 'is-indented' : ''} ${isActive ? 'is-active' : ''}`}
    >
      {getSidebarLabel(route, meta)}
    </Link>
  );
});
