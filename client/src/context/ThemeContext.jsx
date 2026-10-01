import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Must match the key read by `public/theme-init.js` (applied before first paint). */
export const THEME_STORAGE_KEY = 'taskflow-theme';

const PREFERENCES = ['light', 'dark', 'system'];
const THEME_COLORS = { light: '#F5F3EE', dark: '#0F0F0E' };
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext(null);

const toPreference = (value) => (PREFERENCES.includes(value) ? value : 'system');

function readStoredPreference() {
  try {
    return toPreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

/** Applies the theme to <html> with transitions paused so every surface flips in the same frame. */
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  // Force a style flush before transitions are re-enabled on the next frame.
  root.getBoundingClientRect();
  window.requestAnimationFrame(() => root.classList.remove('theme-switching'));
}

/**
 * Colour theme. The user's `preference` is light, dark or system (follows the OS live, the
 * default); `theme` is the resolved light / dark value. Saved per device and synced across tabs.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredPreference);
  const systemTheme = useMediaQuery(DARK_SCHEME_QUERY) ? 'dark' : 'light';
  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY) setPreference(toPreference(event.newValue));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = useCallback((next) => {
    const value = toPreference(next);
    setPreference(value);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Persisting is best-effort; the theme still applies for this session.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, preference, isDark: theme === 'dark', setTheme, toggleTheme }),
    [theme, preference, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * @returns {{ theme: 'light' | 'dark', preference: 'light' | 'dark' | 'system', isDark: boolean,
 *   setTheme: (preference: 'light' | 'dark' | 'system') => void, toggleTheme: () => void }}
 *   `toggleTheme` switches to the opposite of the theme currently shown (an explicit choice).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
