import { useEffect } from 'react';
import { buildPageSchema } from '../lib/schema';

interface PageMetaOptions {
  siteTitle: string;
  pageTitle: string | undefined;
  description: string | undefined;
  schema_type?: string;
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

function setLink(rel: string, href: string) {
  const selector = `link[rel="${rel}"]`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(schema: Record<string, unknown> | undefined) {
  const existing = document.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"][data-litmdx-schema]',
  );
  if (!schema) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('script');
  el.setAttribute('type', 'application/ld+json');
  el.setAttribute('data-litmdx-schema', '');
  el.textContent = JSON.stringify(schema);
  if (!existing) {
    document.head.appendChild(el);
  }
}

export function usePageMeta({ siteTitle, pageTitle, description, schema_type }: PageMetaOptions) {
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
    setLink('canonical', canonical);

    setJsonLd(buildPageSchema({ title: pageTitle, description, schema_type }));
  }, [siteTitle, pageTitle, description, schema_type]);
}
