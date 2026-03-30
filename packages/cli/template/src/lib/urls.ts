export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') return '/';
  return `/${baseUrl.replace(/^\/+|\/+$/g, '')}/`;
}

export function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function withBaseUrl(pathname: string, baseUrl = import.meta.env.BASE_URL): string {
  if (!pathname || pathname === '/') {
    return normalizeBaseUrl(baseUrl);
  }

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

  if (!pathname.startsWith('/')) {
    return pathname;
  }

  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = pathname;
  return normalizedBase === '/'
    ? normalizedPath
    : `${normalizedBase.slice(0, -1)}${normalizedPath}`;
}

export function stripBaseUrl(pathname: string, baseUrl = import.meta.env.BASE_URL): string {
  const normalizedPath = normalizePathname(pathname || '/');
  const normalizedBase = normalizeBaseUrl(baseUrl);

  if (normalizedBase === '/') return normalizedPath;

  const basePrefix = normalizedBase.slice(0, -1);
  if (normalizedPath === basePrefix || normalizedPath === normalizedBase) {
    return '/';
  }

  if (normalizedPath.startsWith(`${basePrefix}/`)) {
    return normalizePathname(normalizedPath.slice(basePrefix.length));
  }

  return normalizedPath;
}

export function joinSiteUrl(siteUrl: string, pathname: string, baseUrl = '/'): string {
  const base = siteUrl.replace(/\/+$/, '');
  return new URL(withBaseUrl(pathname, baseUrl), `${base}/`).toString();
}
