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

  it('injects the theme-init script as the first child of <head>', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    expect(html).toContain('data-litmdx-theme-init');
    // Must appear before any other head element
    const headOpen = html.indexOf('<head>');
    const scriptPos = html.indexOf('data-litmdx-theme-init');
    const titlePos = html.indexOf('<title>');
    expect(scriptPos).toBeGreaterThan(headOpen);
    expect(scriptPos).toBeLessThan(titlePos);
  });

  it('does not inject the theme-init script twice when already present', () => {
    const templateWithScript = template.replace(
      '<head>',
      '<head>\n    <script data-litmdx-theme-init>/* already here */</script>',
    );
    const html = injectStaticMarkup(templateWithScript, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    const count = (html.match(/data-litmdx-theme-init/g) ?? []).length;
    expect(count).toBe(1);
  });
});