/** @vitest-environment happy-dom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg><text>diagram</text></svg>' }),
  },
}));
import { Mermaid } from '../../template/src/components/Mermaid.js';
import { CodeBlock } from '../../template/src/components/CodeBlock.js';
import { Header } from '../../template/src/layout/Header.js';
import { Layout } from '../../template/src/layout/Layout.js';
import { PageHeader } from '../../template/src/layout/PageHeader.js';
import { NotFoundPage } from '../../template/src/layout/NotFoundPage.js';
import { Sidebar } from '../../template/src/layout/sidebar/Sidebar.js';
import { TableOfContents } from '../../template/src/layout/TableOfContents.js';
import { ThemeToggle } from '../../template/src/layout/ThemeToggle.js';
import { useMediaQuery } from '../../template/src/hooks/useMediaQuery.js';
import { usePageMeta } from '../../template/src/hooks/usePageMeta.js';
import { useTableOfContents } from '../../template/src/hooks/useTableOfContents.js';
import { useTheme } from '../../template/src/hooks/useTheme.js';
import { useCopyAction } from '../../template/src/hooks/useCopyAction.js';
import { WebMCPIntegration } from '../../template/src/layout/WebMCPIntegration.js';

type RenderedApp = {
  container: HTMLDivElement;
  rerender: (ui: React.ReactElement) => void;
};

type MatchMediaRecord = {
  matches: boolean;
  listeners: Set<(event: { matches: boolean; media: string }) => void>;
};

const mountedContainers: HTMLDivElement[] = [];
const mediaQueries = new Map<string, MatchMediaRecord>();

let latestIntersectionObserver: FakeIntersectionObserver | undefined;

class FakeMutationObserver {
  observe() {}

  disconnect() {}
}

class FakeIntersectionObserver {
  readonly observed: Element[] = [];

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    latestIntersectionObserver = this;
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  disconnect() {}

  unobserve() {}

  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

function renderApp(ui: React.ReactElement): RenderedApp {
  const container = document.createElement('div');
  document.body.appendChild(container);
  mountedContainers.push(container);

  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });

  return {
    container,
    rerender(nextUi) {
      act(() => {
        root.render(nextUi);
      });
    },
  };
}

function setMediaMatch(query: string, matches: boolean) {
  const record = mediaQueries.get(query);
  if (!record) {
    throw new Error(`No matchMedia mock registered for ${query}`);
  }

  record.matches = matches;
  for (const listener of record.listeners) {
    listener({ matches, media: query });
  }
}

beforeEach(() => {
  mediaQueries.clear();
  latestIntersectionObserver = undefined;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

  vi.stubGlobal('matchMedia', (query: string) => {
    let record = mediaQueries.get(query);
    if (!record) {
      record = { matches: false, listeners: new Set() };
      mediaQueries.set(query, record);
    }

    return {
      media: query,
      get matches() {
        return record.matches;
      },
      addEventListener: (_event: 'change', listener: (event: { matches: boolean; media: string }) => void) => {
        record.listeners.add(listener);
      },
      removeEventListener: (
        _event: 'change',
        listener: (event: { matches: boolean; media: string }) => void,
      ) => {
        record.listeners.delete(listener);
      },
    };
  });

  vi.stubGlobal('MutationObserver', FakeMutationObserver);
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const container of mountedContainers.splice(0)) {
    container.remove();
  }

  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.className = '';
  document.documentElement.style.cssText = '';
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useTheme', () => {
  function ThemeHarness() {
    const { theme, toggleTheme } = useTheme();
    return <button onClick={toggleTheme}>{theme}</button>;
  }

  it('defaults to light when nothing is stored and OS prefers light', () => {
    // matchMedia stub defaults to matches=false, so OS is light
    const { container } = renderApp(<ThemeHarness />);
    expect(container.querySelector('button')?.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads OS dark preference on mount when nothing is stored', () => {
    // Register the media query in the stub map first, then set it to dark.
    window.matchMedia('(prefers-color-scheme: dark)');
    act(() => {
      setMediaMatch('(prefers-color-scheme: dark)', true);
    });

    const { container } = renderApp(<ThemeHarness />);
    expect(container.querySelector('button')?.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    // System-driven: must NOT write to localStorage
    expect(localStorage.getItem('litmdx-theme')).toBeNull();
  });

  it('reads stored theme and applies it on mount', () => {
    localStorage.setItem('litmdx-theme', 'dark');

    const { container } = renderApp(<ThemeHarness />);
    expect(container.querySelector('button')?.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('toggling persists to localStorage and updates DOM', () => {
    localStorage.setItem('litmdx-theme', 'dark');

    const { container } = renderApp(<ThemeHarness />);
    const button = container.querySelector('button')!;

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(button.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('litmdx-theme')).toBe('light');
  });

  it('follows OS changes in real time when no user preference is stored', () => {
    const { container } = renderApp(<ThemeHarness />);

    act(() => {
      setMediaMatch('(prefers-color-scheme: dark)', true);
    });

    expect(container.querySelector('button')?.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      setMediaMatch('(prefers-color-scheme: dark)', false);
    });

    expect(container.querySelector('button')?.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    // System changes must never write to localStorage
    expect(localStorage.getItem('litmdx-theme')).toBeNull();
  });

  it('stops following OS after an explicit toggle', () => {
    const { container } = renderApp(<ThemeHarness />);
    const button = container.querySelector('button')!;

    // User explicitly switches to dark
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(button.textContent).toBe('dark');
    expect(localStorage.getItem('litmdx-theme')).toBe('dark');

    // OS switches back to light — should be ignored
    act(() => {
      setMediaMatch('(prefers-color-scheme: dark)', false);
    });

    expect(button.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('usePageMeta', () => {
  it('writes title and meta tags from the current page state', () => {
    function MetaHarness(props: { siteTitle: string; pageTitle: string | undefined; description: string | undefined }) {
      usePageMeta(props);
      return null;
    }

    renderApp(<MetaHarness siteTitle="LitMDX" pageTitle="Guide" description="Docs intro" />);

    expect(document.title).toBe('Guide | LitMDX');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Docs intro',
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Guide | LitMDX',
    );
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(
      'Docs intro',
    );
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      window.location.href,
    );
  });
});

describe('useMediaQuery', () => {
  it('tracks media-query changes', () => {
    function MediaHarness() {
      const matches = useMediaQuery('(min-width: 1280px)');
      return <output>{matches ? 'desktop' : 'compact'}</output>;
    }

    const { container } = renderApp(<MediaHarness />);
    const output = container.querySelector('output');

    expect(output?.textContent).toBe('compact');

    act(() => {
      setMediaMatch('(min-width: 1280px)', true);
    });

    expect(output?.textContent).toBe('desktop');
  });
});

describe('useTableOfContents', () => {
  it('collects h2/h3 headings and updates the active heading from intersections', () => {
    const article = document.createElement('article');
    article.innerHTML = [
      '<h2 id="intro">Intro</h2>',
      '<p>Body</p>',
      '<h3 id="details">Details</h3>',
    ].join('');
    document.body.appendChild(article);

    function TocHarness() {
      const { tocItems, activeHeadingId } = useTableOfContents(article, '/guide');
      return (
        <div>
          <span data-testid="count">{String(tocItems.length)}</span>
          <span data-testid="active">{activeHeadingId}</span>
          <span data-testid="labels">{tocItems.map((item) => item.text).join('|')}</span>
        </div>
      );
    }

    const { container } = renderApp(<TocHarness />);

    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe('2');
    expect(container.querySelector('[data-testid="active"]')?.textContent).toBe('intro');
    expect(container.querySelector('[data-testid="labels"]')?.textContent).toBe('Intro|Details');
    expect(latestIntersectionObserver?.observed.map((element) => element.id)).toEqual([
      'intro',
      'details',
    ]);

    act(() => {
      latestIntersectionObserver?.trigger([
        {
          target: article.querySelector('#details')!,
          isIntersecting: true,
          boundingClientRect: { top: 24 } as DOMRectReadOnly,
        },
      ]);
    });

    expect(container.querySelector('[data-testid="active"]')?.textContent).toBe('details');
  });
});

describe('TableOfContents', () => {
  it('renders nothing when there are no headings', () => {
    const { container } = renderApp(
      <TableOfContents items={[]} activeHeadingId="" onActivate={() => undefined} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('applies the header offset when navigating to a heading', () => {
    const heading = document.createElement('h2');
    heading.id = 'install';
    heading.textContent = 'Install';
    heading.getBoundingClientRect = () => ({ top: 320 } as DOMRect);
    document.body.appendChild(heading);

    const header = document.createElement('header');
    header.className = 'app-header';
    header.getBoundingClientRect = () => ({ height: 80 } as DOMRect);
    document.body.appendChild(header);

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 120,
    });

    const onActivate = vi.fn();
    const { container } = renderApp(
      <TableOfContents
        items={[{ id: 'install', text: 'Install', level: 2 }]}
        activeHeadingId="install"
        onActivate={onActivate}
        variant="inline"
      />,
    );

    const link = container.querySelector('a');
    act(() => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onActivate).toHaveBeenCalledWith('install');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 344, behavior: 'smooth' });
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '#install');
    expect(link?.className).toContain('is-active');
  });
});

describe('ThemeToggle', () => {
  it('exposes the next theme in the accessible label and calls onToggle', () => {
    const onToggle = vi.fn();
    const { container } = renderApp(<ThemeToggle theme="dark" onToggle={onToggle} />);
    const button = container.querySelector('button');

    expect(button?.getAttribute('aria-label')).toBe('Switch to light mode');
    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggle).toHaveBeenCalledOnce();
  });
});

describe('Header', () => {
  it('keeps the compact header controls available when the sidebar toggle is visible', () => {
    const { container } = renderApp(
      <Header
        title="LitMDX"
        logo={undefined}
        currentPath="/guide"
        routes={[
          { path: '/', importKey: '../docs/index.mdx' },
          { path: '/guide', importKey: '../docs/guide.mdx' },
        ]}
        nav={[
          { label: 'Home', to: '/' },
          { label: 'Guide', to: '/guide' },
        ]}
        github={undefined}
        showSidebarToggle
        sidebarOpen={false}
        onNavigate={() => undefined}
        onToggleSidebar={() => undefined}
        onOpenSearch={() => undefined}
        theme="light"
        onToggleTheme={() => undefined}
      />,
    );

    expect(container.querySelector('.app-sidebar-toggle')).not.toBeNull();
    expect(container.querySelectorAll('.app-header-nav .app-header-link')).toHaveLength(2);
    expect(container.querySelector('.app-brand-title')?.getAttribute('href')).toBe('/');
    expect(container.querySelector('.app-header-link.is-active')?.getAttribute('href')).toBe('/guide');
  });

  it('renders the configured logo as an image inside the brand link', () => {
    const { container } = renderApp(
      <Header
        title="LitMDX"
        logo="/logo.svg"
        currentPath="/"
        routes={[{ path: '/', importKey: '../docs/index.mdx' }]}
        nav={[]}
        github={undefined}
        showSidebarToggle={false}
        sidebarOpen={false}
        onNavigate={() => undefined}
        onToggleSidebar={() => undefined}
        onOpenSearch={() => undefined}
        theme="light"
        onToggleTheme={() => undefined}
      />,
    );

    expect(container.querySelector('.app-brand-logo')?.getAttribute('src')).toBe('/logo.svg');
  });

  it('renders the dark logo variant when the current theme is dark', () => {
    const { container } = renderApp(
      <Header
        title="LitMDX"
        logo={{ light: '/logo-light.svg', dark: '/logo-dark.svg' }}
        currentPath="/"
        routes={[{ path: '/', importKey: '../docs/index.mdx' }]}
        nav={[]}
        github={undefined}
        showSidebarToggle={false}
        sidebarOpen={false}
        onNavigate={() => undefined}
        onToggleSidebar={() => undefined}
        onOpenSearch={() => undefined}
        theme="dark"
        onToggleTheme={() => undefined}
      />,
    );

    // Both images are always in the DOM; CSS (.dark .app-brand-logo--light { display:none })
    // governs visibility. Verify each variant renders with the correct src.
    expect(container.querySelector('.app-brand-logo--light')?.getAttribute('src')).toBe('/logo-light.svg');
    expect(container.querySelector('.app-brand-logo--dark')?.getAttribute('src')).toBe('/logo-dark.svg');
  });
});

describe('Sidebar', () => {
  it('renders top nav items inside the mobile drawer navigation surface', () => {
    const onNavigate = vi.fn();
    const { container } = renderApp(
      <Sidebar
        title="LitMDX"
        routes={[
          { path: '/', importKey: '../docs/index.mdx' },
          { path: '/guide', importKey: '../docs/guide.mdx' },
        ]}
        currentPath="/guide"
        meta={{}}
        nav={[
          { label: 'Home', to: '/' },
          { label: 'Guide', to: '/guide' },
        ]}
        github='https://github.com/example/repo'
        onNavigate={onNavigate}
      />,
    );

    const navItems = [...container.querySelectorAll('.sidebar-mobile-nav-link')];
    expect(navItems.map((item) => item.textContent)).toEqual(['Home', 'Guide', 'GitHub']);
    expect(container.querySelector('.sidebar-mobile-nav-link.is-active')?.textContent).toBe('Guide');
    expect(navItems[0]?.getAttribute('href')).toBe('/');

    act(() => {
      (navItems[0] as HTMLAnchorElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onNavigate).toHaveBeenCalledWith('/', { preserveSidebarOpen: true });
  });

  it('does not render the sidebar title in flat mode', () => {
    const { container } = renderApp(
      <Sidebar
        title="LitMDX"
        routes={[
          { path: '/', importKey: '../docs/index.mdx' },
          { path: '/guide', importKey: '../docs/guide.mdx' },
        ]}
        currentPath="/guide"
        meta={{}}
        nav={[]}
        github={undefined}
        onNavigate={() => undefined}
      />,
    );

    expect(container.querySelector('.sidebar-brand')).toBeNull();
    expect(container.textContent).not.toContain('LitMDX');
  });

  it('renders the sidebar title in multi-section mode', () => {
    const { container } = renderApp(
      <Sidebar
        title="LitMDX"
        routes={[
          { path: '/', importKey: '../docs/home/index.mdx', section: 'home' },
          { path: '/guide/intro', importKey: '../docs/guide/intro.mdx', section: 'guide' },
        ]}
        currentPath="/guide/intro"
        meta={{}}
        nav={[]}
        github={undefined}
        onNavigate={() => undefined}
      />,
    );

    expect(container.querySelector('.sidebar-brand')).not.toBeNull();
    expect(container.querySelector('.sidebar-home')?.textContent).toBe('Guide');
    expect(container.querySelector('.sidebar-home')?.getAttribute('href')).toBe('/guide/intro');
  });
});

describe('Layout', () => {
  it('waits for the current route metadata before rendering the page header title', async () => {
    const routes = [{ path: '/', importKey: '../docs/home/index.mdx', section: 'home' as const }];
    const pages = {
      '../docs/home/index.mdx': () => Promise.resolve({ default: () => React.createElement('div') }),
    };
    const CurrentPage = () => React.createElement('div');

    const { container, rerender } = renderApp(
      <Layout
        title="LitMDX"
        description="Docs"
        nav={[]}
        routes={routes}
        currentPath="/"
        currentRoute={routes[0]}
        pages={pages}
        CurrentPage={CurrentPage}
        meta={{}}
        onNavigate={() => undefined}
      />,
    );

    expect(container.querySelector('.app-page-title')).toBeNull();

    rerender(
      <Layout
        title="LitMDX"
        description="Docs"
        nav={[]}
        routes={routes}
        currentPath="/"
        currentRoute={routes[0]}
        pages={pages}
        CurrentPage={CurrentPage}
        meta={{ '../docs/home/index.mdx': { title: 'LitMDX', description: 'Home page' } }}
        onNavigate={() => undefined}
      />,
    );

    expect(container.querySelector('.app-page-title')?.textContent).toBe('LitMDX');
  });

  it('keeps the mobile sidebar open when switching sections from the drawer nav', async () => {
    const routes = [
      { path: '/', importKey: '../docs/home/index.mdx', section: 'home' as const },
      { path: '/guide/intro', importKey: '../docs/guide/intro.mdx', section: 'guide' as const },
      {
        path: '/community/how-to-participate',
        importKey: '../docs/community/how-to-participate.mdx',
        section: 'community' as const,
      },
    ];
    const pages = {
      '../docs/home/index.mdx': () => Promise.resolve({ default: () => React.createElement('div') }),
      '../docs/guide/intro.mdx': () => Promise.resolve({ default: () => React.createElement('div') }),
      '../docs/community/how-to-participate.mdx': () =>
        Promise.resolve({ default: () => React.createElement('div') }),
    };

    function LayoutHarness() {
      const [currentPath, setCurrentPath] = React.useState('/guide/intro');
      const currentRoute = routes.find((route) => route.path === currentPath);

      return (
        <Layout
          title="LitMDX"
          description="Docs"
          nav={[
            { label: 'Home', to: '/' },
            { label: 'Guide', to: '/guide/intro' },
            { label: 'Community', to: '/community/how-to-participate' },
          ]}
          routes={routes}
          currentPath={currentPath}
          currentRoute={currentRoute}
          pages={pages}
          meta={{}}
          onNavigate={setCurrentPath}
        />
      );
    }

    const { container } = renderApp(<LayoutHarness />);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      container
        .querySelector('.app-sidebar-toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('.app-sidebar-frame')?.className).toContain('is-open');

    act(() => {
      const communityLink = [...container.querySelectorAll('.sidebar-mobile-nav-link')].find(
        (element) => element.textContent === 'Community',
      );
      communityLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('.app-sidebar-frame')?.className).toContain('is-open');
    expect(container.querySelector('.sidebar-link.is-active')?.textContent).toBe('How To Participate');
  });
});

describe('PageHeader', () => {
  it('copies the current page URL and shows the route description', async () => {
    const route = { path: '/guide', importKey: '../docs/guide.mdx' };
    const meta = { '../docs/guide.mdx': { title: 'Guide', description: 'Main guide page' } };

    const { container } = renderApp(
      <PageHeader currentPath="/guide" currentRoute={route} meta={meta} rawPages={{}} />,
    );

    const buttons = container.querySelectorAll('.app-page-action');
    const linkButton = Array.from(buttons).find((b) => b.textContent === 'Copy link');
    await act(async () => {
      linkButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/guide`);
    expect(linkButton?.textContent).toBe('Copied!');
    expect(container.querySelector('.app-page-description')?.textContent).toBe('Main guide page');
  });
});

describe('NotFoundPage', () => {
  it('renders the missing path and links back to home', () => {
    const onNavigate = vi.fn();
    const { container } = renderApp(
      <NotFoundPage path="/missing/page" onNavigate={onNavigate} />,
    );

    expect(container.querySelector('.app-not-found-title')?.textContent).toBe('Page not found');
    expect(container.querySelector('.app-not-found-description code')?.textContent).toBe(
      '/missing/page',
    );
    expect(container.querySelector('.app-not-found-actions a')?.getAttribute('href')).toBe('/');

    act(() => {
      container
        .querySelector('.app-not-found-actions a')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onNavigate).toHaveBeenCalledWith('/');
  });
});

describe('Mermaid', () => {
  it('renders a skeleton while the diagram is loading', () => {
    const { container } = renderApp(<Mermaid>{'graph TD\n  A --> B'}</Mermaid>);
    // The skeleton is rendered synchronously before the async mermaid render resolves.
    expect(container.querySelector('.mermaid-skeleton')).not.toBeNull();
    expect(container.querySelector('.mermaid')).toBeNull();
  });

  it('renders the mermaid SVG after the async render resolves', async () => {
    const { container } = renderApp(<Mermaid>{'graph TD\n  A --> B'}</Mermaid>);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('.mermaid')).not.toBeNull();
    expect(container.querySelector('.mermaid svg')).not.toBeNull();
    expect(container.querySelector('.mermaid-skeleton')).toBeNull();
  });

  it('shows an error state when mermaid.render throws', async () => {
    const { default: mermaid } = await import('mermaid');
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('parse error'));

    const { container } = renderApp(<Mermaid>invalid diagram %%</Mermaid>);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('.mermaid-error')).not.toBeNull();
    expect(container.querySelector('.mermaid-error-label')?.textContent).toBe('Diagram error');
    expect(container.querySelector('.mermaid-error-pre')?.textContent).toContain('parse error');
  });
});

describe('CodeBlock', () => {
  it('renders a pre element with the copy button', () => {
    const { container } = renderApp(
      <CodeBlock>
        <code>{'const x = 1;'}</code>
      </CodeBlock>,
    );
    expect(container.querySelector('.code-block-wrapper')).not.toBeNull();
    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.querySelector('.code-block-copy')).not.toBeNull();
  });

  it('copies the code text to clipboard on button click', async () => {
    const { container } = renderApp(
      <CodeBlock>
        <code>{'const x = 1;'}</code>
      </CodeBlock>,
    );

    const button = container.querySelector<HTMLButtonElement>('.code-block-copy')!;
    await act(async () => {
      button.click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const x = 1;');
  });

  it('shows is-copied class after clicking copy', async () => {
    const { container } = renderApp(
      <CodeBlock>
        <code>{'const x = 1;'}</code>
      </CodeBlock>,
    );

    const button = container.querySelector<HTMLButtonElement>('.code-block-copy')!;
    await act(async () => {
      button.click();
    });

    expect(button.classList.contains('is-copied')).toBe(true);
  });

  it('passes className and extra props to the pre element', () => {
    const { container } = renderApp(
      <CodeBlock className="language-ts">
        <code>{'let y = 2;'}</code>
      </CodeBlock>,
    );

    const pre = container.querySelector('pre');
    expect(pre?.className).toBe('language-ts');
  });
});

describe('useCopyAction', () => {
  beforeEach(() => {
    // Only fake setTimeout/clearTimeout so React's scheduler (MessageChannel) is unaffected.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions to copied when the handler resolves', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    function Harness() {
      const [state, trigger] = useCopyAction(handler);
      return <button data-state={state} onClick={trigger}>{state}</button>;
    }

    const { container } = renderApp(<Harness />);
    const button = container.querySelector('button')!;

    expect(button.getAttribute('data-state')).toBe('idle');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(button.getAttribute('data-state')).toBe('copied');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('transitions to error when the handler rejects', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('clipboard blocked'));

    function Harness() {
      const [state, trigger] = useCopyAction(handler);
      return <button data-state={state} onClick={trigger}>{state}</button>;
    }

    const { container } = renderApp(<Harness />);
    const button = container.querySelector('button')!;

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(button.getAttribute('data-state')).toBe('error');
  });

  it('resets to idle after 1800 ms', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    function Harness() {
      const [state, trigger] = useCopyAction(handler);
      return <button data-state={state} onClick={trigger}>{state}</button>;
    }

    const { container } = renderApp(<Harness />);
    const button = container.querySelector('button')!;

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(button.getAttribute('data-state')).toBe('copied');

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(button.getAttribute('data-state')).toBe('idle');
  });

  it('cancels the pending reset when triggered again before expiry', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    function Harness() {
      const [state, trigger] = useCopyAction(handler);
      return <button data-state={state} onClick={trigger}>{state}</button>;
    }

    const { container } = renderApp(<Harness />);
    const button = container.querySelector('button')!;

    // First trigger.
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    act(() => { vi.advanceTimersByTime(900); });
    expect(button.getAttribute('data-state')).toBe('copied');

    // Second trigger resets the 1800 ms timer.
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    // 900 ms after second trigger — still within 1800 ms window.
    act(() => { vi.advanceTimersByTime(900); });
    expect(button.getAttribute('data-state')).toBe('copied');

    // Complete the 1800 ms window counted from the second trigger.
    act(() => { vi.advanceTimersByTime(900); });
    expect(button.getAttribute('data-state')).toBe('idle');
  });

  it('returns a stable trigger reference across re-renders', () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const refs: Array<() => void> = [];

    function Harness({ n }: { n: number }) {
      const [, trigger] = useCopyAction(handler);
      refs.push(trigger);
      return <span>{n}</span>;
    }

    const { rerender } = renderApp(<Harness n={1} />);
    rerender(<Harness n={2} />);
    rerender(<Harness n={3} />);

    expect(refs[0]).toBe(refs[1]);
    expect(refs[1]).toBe(refs[2]);
  });
});

describe('PageHeader rawPages & action states', () => {
  const route = { path: '/docs', importKey: '../docs/index.mdx' };
  const meta = { '../docs/index.mdx': { title: 'Docs', description: 'Documentation' } };

  it('hides Copy MDX when rawPages has no loader for the current route', () => {
    const { container } = renderApp(
      <PageHeader currentPath="/docs" currentRoute={route} meta={meta} rawPages={{}} />,
    );

    const labels = Array.from(container.querySelectorAll('.app-page-action span')).map(
      (s) => s.textContent,
    );
    expect(labels).not.toContain('Copy MDX');
    expect(labels).toContain('Copy link');
  });

  it('shows Copy MDX when a loader exists for the current route', () => {
    const rawPages = { '../docs/index.mdx': () => Promise.resolve('# Docs') };
    const { container } = renderApp(
      <PageHeader currentPath="/docs" currentRoute={route} meta={meta} rawPages={rawPages} />,
    );

    const labels = Array.from(container.querySelectorAll('.app-page-action span')).map(
      (s) => s.textContent,
    );
    expect(labels).toContain('Copy MDX');
  });

  it('clicking Copy MDX invokes the loader and writes the raw content to clipboard', async () => {
    const rawContent = '# Docs\nHello world';
    const loader = vi.fn().mockResolvedValue(rawContent);
    const rawPages = { '../docs/index.mdx': loader };

    const { container } = renderApp(
      <PageHeader currentPath="/docs" currentRoute={route} meta={meta} rawPages={rawPages} />,
    );

    const mdxButton = Array.from(container.querySelectorAll('.app-page-action')).find(
      (b) => b.querySelector('span')?.textContent === 'Copy MDX',
    )!;

    await act(async () => {
      mdxButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(loader).toHaveBeenCalledOnce();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(rawContent);
    expect(mdxButton.querySelector('span')?.textContent).toBe('Copied!');
    expect(mdxButton.getAttribute('data-state')).toBe('copied');
  });

  it('shows error data-state and label when the clipboard write fails during Copy MDX', async () => {
    const rawPages = { '../docs/index.mdx': () => Promise.resolve('# Docs') };
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('permission denied'),
    );

    const { container } = renderApp(
      <PageHeader currentPath="/docs" currentRoute={route} meta={meta} rawPages={rawPages} />,
    );

    const mdxButton = Array.from(container.querySelectorAll('.app-page-action')).find(
      (b) => b.querySelector('span')?.textContent === 'Copy MDX',
    )!;

    await act(async () => {
      mdxButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mdxButton.getAttribute('data-state')).toBe('error');
    expect(mdxButton.querySelector('span')?.textContent).toBe('Copy failed');
  });

  it('Copy link button starts idle and switches to copied after click', async () => {
    const { container } = renderApp(
      <PageHeader currentPath="/docs" currentRoute={route} meta={meta} rawPages={{}} />,
    );

    const linkButton = Array.from(container.querySelectorAll('.app-page-action')).find(
      (b) => b.querySelector('span')?.textContent === 'Copy link',
    )!;

    expect(linkButton.getAttribute('data-state')).toBe('idle');

    await act(async () => {
      linkButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(linkButton.getAttribute('data-state')).toBe('copied');
  });

  it('hides Copy MDX when currentRoute is undefined', () => {
    const { container } = renderApp(
      <PageHeader currentPath="/missing" currentRoute={undefined} meta={{}} rawPages={{}} />,
    );

    const labels = Array.from(container.querySelectorAll('.app-page-action span')).map(
      (s) => s.textContent,
    );
    expect(labels).not.toContain('Copy MDX');
  });
});

describe('WebMCPIntegration', () => {
  const routes = [
    { path: '/', importKey: '../docs/index.mdx' },
    { path: '/guide', importKey: '../docs/guide.mdx' },
    { path: '/api', importKey: '../docs/api.mdx' },
  ];

  const meta = {
    '../docs/index.mdx': { title: 'Home', description: 'Home page' },
    '../docs/guide.mdx': { title: 'Guide', description: 'Getting started' },
    '../docs/api.mdx': { title: 'API Reference', description: 'API docs' },
  };

  function makeModelContext() {
    const toolMap = new Map<string, (input: Record<string, unknown>) => Promise<unknown>>();

    const registerTool = vi.fn(
      (
        tool: { name: string; execute: (input: Record<string, unknown>) => Promise<unknown> },
        _opts?: { signal?: AbortSignal },
      ) => {
        toolMap.set(tool.name, tool.execute);
      },
    );

    return {
      registerTool,
      execute(name: string, input: Record<string, unknown> = {}) {
        const fn = toolMap.get(name);
        if (!fn) throw new Error(`Tool not registered: ${name}`);
        return fn(input);
      },
    };
  }

  it('skips registration when navigator.modelContext is absent', () => {
    // beforeEach stubs navigator without modelContext — component should render null silently.
    const { container } = renderApp(
      <WebMCPIntegration
        routes={routes}
        meta={meta}
        currentPath="/"
        onNavigate={vi.fn()}
        rawPages={{}}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('registers all five tools when modelContext is present', () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration
        routes={routes}
        meta={meta}
        currentPath="/"
        onNavigate={vi.fn()}
        rawPages={{}}
      />,
    );

    expect(ctx.registerTool).toHaveBeenCalledTimes(5);
    const names = ctx.registerTool.mock.calls.map((c) => c[0].name);
    expect(names).toEqual(
      expect.arrayContaining([
        'list_pages',
        'navigate_to',
        'get_current_page',
        'search_pages',
        'get_page_content',
      ]),
    );
  });

  it('list_pages returns all routes with titles from meta', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    const result = await ctx.execute('list_pages') as Array<{ path: string; title: string; description: string }>;
    expect(result).toEqual([
      { path: '/', title: 'Home', description: 'Home page' },
      { path: '/guide', title: 'Guide', description: 'Getting started' },
      { path: '/api', title: 'API Reference', description: 'API docs' },
    ]);
  });

  it('navigate_to calls onNavigate and returns the navigated path', async () => {
    const ctx = makeModelContext();
    const onNavigate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={onNavigate} rawPages={{}} />,
    );

    const result = await ctx.execute('navigate_to', { path: '/guide' });
    expect(onNavigate).toHaveBeenCalledWith('/guide');
    expect(result).toEqual({ navigated: '/guide' });
  });

  it('navigate_to throws for an unknown path', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    await expect(ctx.execute('navigate_to', { path: '/unknown' })).rejects.toThrow(
      'Page not found: /unknown',
    );
  });

  it('navigate_to throws for an empty path', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    await expect(ctx.execute('navigate_to', { path: '' })).rejects.toThrow(
      'navigate_to: path is required',
    );
  });

  it('get_current_page returns path, title and description of the active route', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/guide" onNavigate={vi.fn()} rawPages={{}} />,
    );

    const result = await ctx.execute('get_current_page');
    expect(result).toEqual({
      path: '/guide',
      title: 'Guide',
      description: 'Getting started',
    });
  });

  it('search_pages filters by query matching title, description and path', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    const titleMatch = await ctx.execute('search_pages', { query: 'guide' }) as Array<{ path: string }>;
    expect(titleMatch.map((r) => r.path)).toEqual(['/guide']);

    const descMatch = await ctx.execute('search_pages', { query: 'api docs' }) as Array<{ path: string }>;
    expect(descMatch.map((r) => r.path)).toContain('/api');
  });

  it('get_page_content loads the MDX source via rawPages', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    const rawContent = '# Guide\nHello WebMCP';
    const loader = vi.fn().mockResolvedValue(rawContent);
    const rawPages = { '../docs/guide.mdx': loader };

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={rawPages} />,
    );

    const result = await ctx.execute('get_page_content', { path: '/guide' });
    expect(loader).toHaveBeenCalledOnce();
    expect(result).toEqual({ path: '/guide', content: rawContent });
  });

  it('get_page_content throws for an unknown path', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    await expect(ctx.execute('get_page_content', { path: '/unknown' })).rejects.toThrow(
      'Page not found: /unknown',
    );
  });

  it('get_page_content throws for an empty path', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    await expect(ctx.execute('get_page_content', { path: '' })).rejects.toThrow(
      'get_page_content: path is required',
    );
  });

  it('search_pages with empty query returns no results', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    const result = await ctx.execute('search_pages', { query: '' });
    expect(result).toEqual([]);
  });

  it('get_page_content throws when rawPages has no loader for the matched route', async () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    renderApp(
      <WebMCPIntegration routes={routes} meta={meta} currentPath="/" onNavigate={vi.fn()} rawPages={{}} />,
    );

    await expect(ctx.execute('get_page_content', { path: '/guide' })).rejects.toThrow(
      'Content not available for: /guide',
    );
  });

  it('aborts all tool registrations when the component unmounts', () => {
    const ctx = makeModelContext();
    vi.stubGlobal('navigator', { ...navigator, modelContext: ctx });

    function Toggle({ show }: { show: boolean }) {
      return show ? (
        <WebMCPIntegration
          routes={routes}
          meta={meta}
          currentPath="/"
          onNavigate={vi.fn()}
          rawPages={{}}
        />
      ) : null;
    }

    const { rerender } = renderApp(<Toggle show={true} />);
    const signal = ctx.registerTool.mock.calls[0][1]?.signal as AbortSignal;
    expect(signal).toBeDefined();
    expect(signal.aborted).toBe(false);

    rerender(<Toggle show={false} />);
    expect(signal.aborted).toBe(true);
  });
});
