import { memo } from 'react';
import type { BreadcrumbItem } from '../lib/navigation';
import { Link } from '../components/Link';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
}

export const Breadcrumbs = memo(function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="app-breadcrumbs" aria-label="Breadcrumbs">
      <ol className="app-breadcrumbs-list">
        {items.map((item, index) => (
          <li key={`${item.path}-${index}`} className="app-breadcrumb-item">
            {index > 0 ? (
              <span className="app-breadcrumb-separator" aria-hidden="true">
                /
              </span>
            ) : null}
            {item.current ? (
              <span aria-current="page" className="app-breadcrumb-current">
                {item.label}
              </span>
            ) : item.navigable === false ? (
              <span className="app-breadcrumb-text">{item.label}</span>
            ) : (
              <Link href={item.path} className="app-breadcrumb-link" onNavigate={onNavigate}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
});
