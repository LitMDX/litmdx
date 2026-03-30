import type { ReactNode } from 'react';
import { Link } from './Link';

interface CardProps {
  title: string;
  href?: string;
  children?: ReactNode;
}

export function Card({ title, href, children }: CardProps) {
  const inner = (
    <div className="card-panel not-prose">
      <p className="card-title">{title}</p>
      {children && <div className="card-body">{children}</div>}
    </div>
  );

  return href ? (
    <Link href={href} className="card-link not-prose">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

type ColCount = 2 | 3 | 4;

const colClass: Record<ColCount, string> = {
  2: 'is-2',
  3: 'is-3',
  4: 'is-4',
};

interface CardGridProps {
  children: ReactNode;
  cols?: ColCount;
}

export function CardGrid({ children, cols = 2 }: CardGridProps) {
  return <div className={`card-grid not-prose ${colClass[cols]}`}>{children}</div>;
}
