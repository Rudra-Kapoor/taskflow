/**
 * Applies `update(params)` to the CURRENT URL's search params and commits them.
 *
 * React Router's functional `setSearchParams(fn)` hands `fn` the params of the last render, so
 * two updates in quick succession (e.g. two filter changes) can overwrite each other.
 * BrowserRouter updates `window.location` synchronously on every navigation, so starting from it
 * always builds on the latest URL.
 *
 * @param {Function} setSearchParams the setter from `useSearchParams()`
 * @param {(params: URLSearchParams) => void} update mutates the params in place
 * @param {{ replace?: boolean, state?: unknown }} [options] navigation options
 */
export function updateSearchParams(setSearchParams, update, options) {
  const next = new URLSearchParams(window.location.search);
  update(next);
  setSearchParams(next, options);
}
