import React from 'react';

interface FooterProps {
  description?: string;
}

export function Footer({ description }: FooterProps) {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        {description ? <p className="app-footer-description">{description}</p> : null}
        <p className="app-footer-brand">
          Built with{' '}
          <a
            href="https://litmdx.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="app-footer-link"
          >
            LitMDX
          </a>
        </p>
      </div>
    </footer>
  );
}
