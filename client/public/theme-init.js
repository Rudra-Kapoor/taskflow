/*
 * Runs synchronously in <head> before the app bundle so the correct colour theme is applied
 * before first paint (no light/dark flash). Kept as an external file so it works under a strict
 * Content-Security-Policy that forbids inline scripts. Must stay in sync with ThemeContext.jsx:
 * the stored preference is 'light', 'dark' or 'system' (follows the OS). Without one, dark is used.
 */
(function applyInitialTheme() {
  var STORAGE_KEY = 'taskflow-theme';
  var THEME_COLORS = { light: '#F5F3EE', dark: '#0F0F0E' };
  var preference = 'dark';

  try {
    var stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') preference = stored;
  } catch {
    // Storage can be unavailable (private mode, disabled cookies): keep the dark default.
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
