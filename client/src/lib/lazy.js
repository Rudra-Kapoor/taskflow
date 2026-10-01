import { lazy } from 'react';

const RELOAD_STAMP_KEY = 'taskflow-chunk-reload';
/** At most one automatic reload in this window, so a broken deploy can't cause a reload loop. */
const RELOAD_COOLDOWN_MS = 10_000;

/** Messages of failed dynamic imports (Chrome, Firefox, Safari) and Vite's CSS preloading. */
const CHUNK_ERROR_PATTERN =
  /dynamically imported module|importing a module script failed|unable to preload css/i;

/** True when `error` means a lazily loaded file could not be fetched (e.g. after a redeploy). */
export function isChunkLoadError(error) {
  return CHUNK_ERROR_PATTERN.test(String(error?.message ?? ''));
}

/** Reloads the page once per cooldown; returns false when a reload just happened. */
function reloadOnce() {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_STAMP_KEY)) || 0;
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    window.sessionStorage.setItem(RELOAD_STAMP_KEY, String(Date.now()));
  } catch {
    return false; // without storage there is no loop guard: let the error boundary handle it
  }
  window.location.reload();
  return true;
}

/**
 * `React.lazy` for a named export: `lazyNamed(() => import('@/pages/LoginPage'), 'LoginPage')`.
 * After a redeploy the previous build's chunks no longer exist, so a failed import reloads the
 * page once to pick up the new build; if it fails again the error reaches the nearest
 * ErrorBoundary, which offers a manual reload.
 */
export function lazyNamed(load, exportName) {
  return lazy(() =>
    load().then(
      (module) => ({ default: module[exportName] }),
      (error) => {
        // Stay suspended (no error flash) while the browser reloads.
        if (isChunkLoadError(error) && reloadOnce()) return new Promise(() => {});
        throw error;
      },
    ),
  );
}
