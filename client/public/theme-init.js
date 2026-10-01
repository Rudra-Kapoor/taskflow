/*
 * Runs synchronously in <head> before the app bundle so the correct colour theme is applied
 * before first paint (no light/dark flash). Kept as an external file so it works under a strict
 * Content-Security-Policy that forbids inline scripts. Must stay in sync with ThemeContext.jsx:
 * the stored preference is 'light', 'dark' or 'system' (also the default), which follows the OS.
 */
(function applyInitialTheme() {
  var STORAGE_KEY = 'taskflow-theme';
  var THEME_COLORS = { light: '#ffffff', dark: '#121725' };
  var preference = 'system';

  try {
    var stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch {
    // Storage can be unavailable (private mode, disabled cookies): follow the OS.
  }

  var prefersDark =
    Boolean(window.matchMedia) && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;

  var root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
})();
