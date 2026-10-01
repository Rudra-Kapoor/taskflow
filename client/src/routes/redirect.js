const AUTH_PATHS = ['/login', '/register'];

/**
 * Validates a `?redirect=` value so it can only point inside this app - never to another
 * origin (`//evil.com`, `/%09/evil.com`, `/\evil.com`, `https://…`, `javascript:…`) - and never
 * back to the auth pages. The value is resolved the way the browser would resolve it, so tricks
 * the URL parser normalises (tabs, backslashes) cannot slip through.
 * @returns {string} the in-app target (`pathname + search + hash`), or `fallback`
 */
export function getSafeRedirect(value, fallback = '/') {
  if (typeof value !== 'string' || !value) return fallback;
  let url;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    return fallback;
  }
  if (url.origin !== window.location.origin) return fallback;
  const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();
  if (AUTH_PATHS.includes(pathname)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Builds `/login?redirect=<current location>` (omits the param for the home page). */
export function buildLoginRedirect(location) {
  const target = `${location.pathname}${location.search}${location.hash}`;
  return target && target !== '/' ? `/login?redirect=${encodeURIComponent(target)}` : '/login';
}
