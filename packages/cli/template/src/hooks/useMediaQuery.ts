import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  // Always start with false to match the SSG-rendered HTML (no window during prerender).
  // The correct value is applied in the first effect, before the browser paints.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
