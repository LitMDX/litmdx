import { memo, useCallback } from 'react';
import { getRouteTitle } from '../lib/navigation';
import { useCopyAction } from '../hooks/useCopyAction';
import type { CopyState } from '../hooks/useCopyAction';
import type { PageMetaMap, Route } from '../lib/types';
import { withBaseUrl } from '../lib/urls';

function actionLabel(state: CopyState, idleLabel: string): string {
  if (state === 'copied') return 'Copied!';
  if (state === 'error') return 'Copy failed';
  return idleLabel;
}

interface PageHeaderProps {
  currentPath: string;
  currentRoute: Route | undefined;
  meta: PageMetaMap;
  rawPages: Record<string, () => Promise<string>>;
}

export const PageHeader = memo(function PageHeader({
  currentPath,
  currentRoute,
  meta,
  rawPages,
}: PageHeaderProps) {
  const title = currentRoute ? getRouteTitle(currentRoute, meta) : 'Page not found';
  const description = currentRoute ? meta[currentRoute.importKey]?.description : undefined;
  const hasMdx = Boolean(currentRoute && rawPages[currentRoute.importKey]);

  const copyLinkFn = useCallback(async () => {
    const href = new URL(withBaseUrl(currentPath), window.location.origin).toString();
    await navigator.clipboard.writeText(href);
  }, [currentPath]);

  const copyMdxFn = useCallback(async () => {
    if (!currentRoute) throw new Error('no route');
    const load = rawPages[currentRoute.importKey];
    if (!load) throw new Error('no loader');
    await navigator.clipboard.writeText(await load());
  }, [currentRoute, rawPages]);

  const [linkState, triggerCopyLink] = useCopyAction(copyLinkFn);
  const [mdxState, triggerCopyMdx] = useCopyAction(copyMdxFn);

  return (
    <header className="app-page-header">
      <div className="app-page-header-copy">
        <h1 className="app-page-title">{title}</h1>
        <div className="app-page-actions">
          {hasMdx && (
            <button
              type="button"
              className="app-page-action"
              data-state={mdxState}
              onClick={triggerCopyMdx}
            >
              <span aria-live="polite">{actionLabel(mdxState, 'Copy MDX')}</span>
            </button>
          )}
          <button
            type="button"
            className="app-page-action"
            data-state={linkState}
            onClick={triggerCopyLink}
          >
            <span aria-live="polite">{actionLabel(linkState, 'Copy link')}</span>
          </button>
        </div>
      </div>
      {description ? <p className="app-page-description">{description}</p> : null}
    </header>
  );
});
