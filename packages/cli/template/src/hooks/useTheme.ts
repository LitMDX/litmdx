import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThemeMode } from '../lib/types';

const THEME_STORAGE_KEY = 'litmdx-theme';
const DARK_MQ = '(prefers-color-scheme: dark)';

function getStoredTheme(): ThemeMode | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be unavailable
  }
  return null;
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function useTheme() {
  // Always start with 'light' — matches the SSG-rendered HTML.
  // The blocking inline script in index.html applies the correct class
  // before the first paint so the user never sees a flash.
  const [theme, setTheme] = useState<ThemeMode>('light');

  // True when the current theme reflects an explicit preference (stored or toggled).
  // Prevents the OS listener from overriding a deliberate user choice.
  // A ref is used intentionally: changes to this flag must not trigger extra renders.
  const hasUserChoiceRef = useRef(false);

  // Set to true by toggleTheme so the next theme-change effect writes to localStorage.
  // Kept as a ref for the same reason: it is a one-shot flag, not UI state.
  const pendingPersistRef = useRef(false);

  // On mount: resolve initial theme from storage or OS preference.
  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) hasUserChoiceRef.current = true;
    setTheme(stored ?? (window.matchMedia(DARK_MQ).matches ? 'dark' : 'light'));
  }, []);

  // Apply theme class / colorScheme to <html> on every theme change.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow live OS preference changes — only when the user has not made an explicit choice.
  // Registered once on mount and gated by hasUserChoiceRef at event time.
  useEffect(() => {
    const mq = window.matchMedia(DARK_MQ);
    const handleChange = (e: MediaQueryListEvent) => {
      if (!hasUserChoiceRef.current) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Persist to localStorage only when triggered by an explicit user toggle.
  // System-driven changes and the initial mount are intentionally excluded.
  useEffect(() => {
    if (!pendingPersistRef.current) return;
    pendingPersistRef.current = false;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    hasUserChoiceRef.current = true;
    pendingPersistRef.current = true;
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
