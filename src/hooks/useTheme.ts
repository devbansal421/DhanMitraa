import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dhanmitraa:theme';
export type Theme = 'light' | 'dark';

/** Shared light/dark state. The `<html>` class is set before paint by a script in
 *  index.html; this hook keeps React in sync and follows the OS until the user picks. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      let hasChoice = false;
      try { hasChoice = Boolean(localStorage.getItem(STORAGE_KEY)); } catch { /* ignore */ }
      if (!hasChoice) setThemeState(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  return { theme, setTheme };
}
