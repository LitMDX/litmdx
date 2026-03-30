import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { NavigateFn, NavigateOptions } from '../lib/types';
import { withBaseUrl } from '../lib/urls';

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
  onNavigate?: NavigateFn;
  navigateOptions?: NavigateOptions;
}

function isInternalPath(href: string | undefined): href is string {
  return typeof href === 'string' && href.startsWith('/');
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

export function Link({
  href,
  children,
  onClick,
  onNavigate,
  navigateOptions,
  target,
  ...props
}: LinkProps) {
  const resolvedHref = href ? withBaseUrl(href) : href;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (!onNavigate || !isInternalPath(href) || target === '_blank' || !isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    if (navigateOptions) {
      onNavigate(href, navigateOptions);
      return;
    }

    onNavigate(href);
  }

  return (
    <a {...props} href={resolvedHref} target={target} onClick={handleClick}>
      {children}
    </a>
  );
}
