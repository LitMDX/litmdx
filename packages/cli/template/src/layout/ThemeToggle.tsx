import type { ThemeMode } from '../lib/types';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="app-icon-button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span className="theme-toggle-icons" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`theme-toggle-icon ${theme === 'light' ? 'is-active' : ''}`}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
        </svg>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`theme-toggle-icon ${theme === 'dark' ? 'is-active' : ''}`}
        >
          <path d="M21 14.2A8.98 8.98 0 0 1 9.8 3a1 1 0 0 0-1.24 1.24A9 9 0 1 0 19.76 15.44 1 1 0 0 0 21 14.2Z" />
        </svg>
      </span>
      <span className="app-visually-hidden">Current theme: {theme}</span>
    </button>
  );
}
