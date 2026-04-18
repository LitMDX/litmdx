export interface NavItem {
  label: string;
  to?: string; // internal route
  href?: string; // external link
}

export interface FooterConfig {
  description?: string;
}
