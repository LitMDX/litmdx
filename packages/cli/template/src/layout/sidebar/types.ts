import type { Route } from '../../lib/types';

export type SidebarRouteItem = { kind: 'route'; route: Route };
export type SidebarGroupItem = {
  kind: 'group';
  label: string;
  routes: Route[];
  defaultCollapsed?: boolean;
};
export type SidebarItem = SidebarRouteItem | SidebarGroupItem;
