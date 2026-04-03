import type { ComponentType } from 'react';

export interface NavItem {
  label: string;
  to?: string;
  href?: string;
}

export interface NavigateOptions {
  preserveSidebarOpen?: boolean;
}

export type NavigateFn = (path: string, options?: NavigateOptions) => void;

export interface Frontmatter {
  title?: string;
  description?: string;
  sidebar_position?: number;
  sidebar_label?: string;
  sidebar_collapsed?: boolean;
  sidebar_hidden?: boolean;
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeAsset {
  light?: string;
  dark?: string;
}

export interface Route {
  path: string;
  importKey: string;
  /** Assigned in multi-section mode. 'home' | 'community' | etc. */
  section?: string;
}

export type PageMetaMap = Record<string, Frontmatter>;

export type GlobMap = Record<string, () => Promise<unknown>>;

export interface PageModule {
  default: ComponentType<{ components?: Record<string, unknown> }>;
  frontmatter?: Frontmatter;
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}
