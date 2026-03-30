export function PageLoading() {
  return (
    <div className="app-page-loading" aria-live="polite" aria-busy="true">
      <div className="app-page-loading-header">
        <span className="app-page-loading-kicker" />
        <span className="app-page-loading-action" />
      </div>
      <span className="app-page-loading-title" />
      <span className="app-page-loading-lead" />
      <span className="app-page-loading-lead short" />
      <div className="app-page-loading-body">
        <span className="app-page-loading-line" />
        <span className="app-page-loading-line" />
        <span className="app-page-loading-line short" />
        <div className="app-page-loading-block" />
        <span className="app-page-loading-line" />
        <span className="app-page-loading-line medium" />
      </div>
    </div>
  );
}
