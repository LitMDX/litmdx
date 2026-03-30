import { describe, expect, it } from 'vitest';
import { injectStaticMarkup, routeToOutputPath } from '../src/ssg/index.js';

describe('routeToOutputPath', () => {
  it('writes the root route to dist/index.html', () => {
    expect(routeToOutputPath('/tmp/dist', '/')).toBe('/tmp/dist/index.html');
  });

  it('writes nested routes to dist/<route>/index.html', () => {
    expect(routeToOutputPath('/tmp/dist', '/guide/install')).toBe('/tmp/dist/guide/install/index.html');
  });
});

describe('injectStaticMarkup', () => {
  const template = `<!doctype html>
<html>
<head>
  <title>LitMDX Docs</title>
  <meta name="description" content="" />
  <meta property="og:title" content="LitMDX Docs" />
  <meta property="og:description" content="" />
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

  it('injects prerendered HTML into #root', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    expect(html).toContain('<div id="root"><main>hello</main></div>');
  });

  it('replaces title and meta tags', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    expect(html).toContain('<title>Guide | LitMDX</title>');
    expect(html).toContain('<meta name="description" content="Guide page" />');
    expect(html).toContain('<meta property="og:title" content="Guide | LitMDX" />');
    expect(html).toContain('<meta property="og:description" content="Guide page" />');
  });

  it('inserts og:url when provided', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
      ogUrl: 'https://docs.example.com/guide',
    });
    expect(html).toContain('<meta property="og:url" content="https://docs.example.com/guide" />');
  });
});