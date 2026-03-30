export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') return '/';
  return `/${baseUrl.replace(/^\/+|\/+$/g, '')}/`;
}

export function withBaseUrl(pathname: string, baseUrl: string): string {
  if (!pathname || pathname === '/') return normalizeBaseUrl(baseUrl);

  if (
    pathname.startsWith('#') ||
    pathname.startsWith('http://') ||
    pathname.startsWith('https://') ||
    pathname.startsWith('//') ||
    pathname.startsWith('mailto:') ||
    pathname.startsWith('tel:')
  ) {
    return pathname;
  }

  if (!pathname.startsWith('/')) return pathname;

  const normalizedBase = normalizeBaseUrl(baseUrl);
  return normalizedBase === '/' ? pathname : `${normalizedBase.slice(0, -1)}${pathname}`;
}
