import { useEffect } from 'react';

interface PageMetaOptions {
  siteTitle: string;
  pageTitle: string | undefined;
  description: string | undefined;
}

function setMeta(name: string, content: string, type: 'name' | 'property' = 'name') {
  const selector = `meta[${type}="${name}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(type, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageMeta({ siteTitle, pageTitle, description }: PageMetaOptions) {
  useEffect(() => {
    const title = pageTitle ? `${pageTitle} | ${siteTitle}` : siteTitle;
    document.title = title;
    setMeta('og:title', title, 'property');

    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, 'property');
    }

    const canonical = window.location.href;
    setMeta('og:url', canonical, 'property');
  }, [siteTitle, pageTitle, description]);
}
