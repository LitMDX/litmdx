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

  it('inserts canonical link when ogUrl is provided', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
      ogUrl: 'https://docs.example.com/guide',
    });
    expect(html).toContain('<link rel="canonical" href="https://docs.example.com/guide" />');
  });

  it('does not insert canonical link when ogUrl is not provided', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    expect(html).not.toContain('rel="canonical"');
  });

  it('replaces existing canonical link when ogUrl is provided', () => {
    const templateWithCanonical = template.replace(
      '</head>',
      '  <link rel="canonical" href="https://docs.example.com/" />\n</head>',
    );
    const html = injectStaticMarkup(templateWithCanonical, '', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
      ogUrl: 'https://docs.example.com/guide',
    });
    expect(html).toContain('<link rel="canonical" href="https://docs.example.com/guide" />');
    expect(html).not.toContain('href="https://docs.example.com/"');
  });

  it('inserts og:image when ogImage is provided', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
      ogImage: 'https://docs.example.com/og-guide.png',
    });
    expect(html).toContain('<meta property="og:image" content="https://docs.example.com/og-guide.png" />');
  });

  it('does not insert og:image when ogImage is not provided', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    expect(html).not.toContain('og:image');
  });

  it('inserts noindex robots meta when noindex is true', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Draft | LitMDX',
      description: 'Internal draft',
      ogTitle: 'Draft | LitMDX',
      ogDescription: 'Internal draft',
      noindex: true,
    });
    expect(html).toContain('<meta name="robots" content="noindex" />');
  });

  it('does not insert robots meta when noindex is false', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
      noindex: false,
    });
    expect(html).not.toContain('name="robots"');
  });

  it('does not insert robots meta when noindex is omitted', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    expect(html).not.toContain('name="robots"');
  });

  it('injects a JSON-LD script tag when schema is provided', () => {
    const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: 'Guide' };
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
      jsonLd: JSON.stringify(schema),
    });
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"headline":"Guide"');
    expect(html.indexOf('<script type="application/ld+json">')).toBeLessThan(html.indexOf('</head>'));
  });

  it('does not inject a JSON-LD script when schema is omitted', () => {
    const html = injectStaticMarkup(template, '<main>hello</main>', {
      title: 'Guide | LitMDX',
      description: 'Guide page',
      ogTitle: 'Guide | LitMDX',
      ogDescription: 'Guide page',
    });
    expect(html).not.toContain('application/ld+json');
  });

  it('sanitizes </script> in JSON-LD to prevent early tag termination', () => {
    const schema = { '@context': 'https://schema.org', name: '</script><script>alert(1)</script>' };
    const html = injectStaticMarkup(template, '', {
      title: 'T',
      description: 'd',
      ogTitle: 'T',
      ogDescription: 'd',
      jsonLd: JSON.stringify(schema),
    });
    // The literal string </script> must not appear unescaped inside the ld+json block
    const ldJson = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '';
    expect(ldJson).not.toContain('</script>');
    expect(ldJson).toContain('<\\/script>');
  });

  it('escapes special characters in ogImage URL', () => {
    const html = injectStaticMarkup(template, '', {
      title: 'T',
      description: 'd',
      ogTitle: 'T',
      ogDescription: 'd',
      ogImage: 'https://example.com/image?a=1&b=2',
    });
    expect(html).toContain('content="https://example.com/image?a=1&amp;b=2"');
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