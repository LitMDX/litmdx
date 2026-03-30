import { memo } from 'react';
import { Link } from '../components/Link';

interface NotFoundPageProps {
  path: string;
  onNavigate: (path: string) => void;
}

export const NotFoundPage = memo(function NotFoundPage({ path, onNavigate }: NotFoundPageProps) {
  return (
    <section className="app-not-found" aria-labelledby="app-not-found-title">
      <p className="app-not-found-code">404</p>
      <h1 id="app-not-found-title" className="app-not-found-title">
        Page not found
      </h1>
      <p className="app-not-found-description">
        No content exists at <code>{path}</code>.
      </p>
      <div className="app-not-found-actions">
        <Link href="/" className="app-page-action" onNavigate={onNavigate}>
          Go home
        </Link>
      </div>
    </section>
  );
});
