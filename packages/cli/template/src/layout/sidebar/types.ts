import type { Route } from '../../lib/types';

export type SidebarRouteItem = { kind: 'route'; route: Route };
export type SidebarGroupItem = {
  kind: 'group';
  label: string;
  items: SidebarItem[];
  defaultCollapsed?: boolean;
};
export type SidebarItem = SidebarRouteItem | SidebarGroupItem;
