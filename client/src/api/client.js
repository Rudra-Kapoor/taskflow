import axios from 'axios';

/** REST API base URL. Empty `VITE_API_URL` = same-origin `/api` (proxied by Vite in development). */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Window event announcing that the session is no longer valid (AuthContext signs the user out). */
export const AUTH_LOGOUT_EVENT = 'auth:logout';

export const TOKEN_STORAGE_KEY = 'taskflow_token';

const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Check your connection.';

/** Endpoints where a 401 means "wrong credentials" rather than "session expired". */
const CREDENTIAL_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/me/password'];

/**
 * How long a rejected token may still be replaced before the session ends: a password change in
 * another tab revokes it a moment before that tab stores the new token.
 */
const TOKEN_REPLACEMENT_GRACE_MS = 1000;

/** Fallback messages for responses that carry no server `message`. */
const STATUS_MESSAGES = {
  403: 'You do not have permission to do that.',
  404: 'The requested resource could not be found.',
  413: 'The request is too large.',
  429: 'Too many requests. Please wait a moment and try again.',
};

// Keeps the session alive in this tab when localStorage is unavailable (e.g. blocked storage).
let memoryToken = null;

/** JWT persistence (localStorage key `taskflow_token`). */
export const tokenStorage = {
  get() {
    try {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return memoryToken;
    }
  },
  set(token) {
    memoryToken = token;
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage unavailable: the in-memory copy keeps this tab signed in.
    }
  },
  clear() {
    memoryToken = null;
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Storage unavailable: nothing was persisted.
    }
  },
};

/** Forgets the stored token and tells the app that the session is over. */
export function expireSession() {
  tokenStorage.clear();
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

/** Account id (`sub` claim) of a JWT. Decoded, not verified: only used to tell sessions apart. */
function getTokenAccount(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(payload)).sub ?? null;
  } catch {
    return null;
  }
}

/** True when both tokens belong to the same account (e.g. before and after a password change). */
export function isSameAccount(tokenA, tokenB) {
  const account = tokenA ? getTokenAccount(tokenA) : null;
  return account !== null && account === (tokenB ? getTokenAccount(tokenB) : null);
}

// Settles once the token rotation in flight (a password change), if any, has stored its token.
let pendingRotation = Promise.resolve();

/**
 * Sends a request that rotates the session token - `send` resolves with the new token - and
 * stores the new token, unless the user signed out meanwhile. Requests rejected in between (sent
 * with the token being revoked) wait for it instead of ending the session.
 * @param {() => Promise<string>} send
 * @returns {Promise<string>} the new token
 */
export function rotateToken(send) {
  const previousToken = tokenStorage.get();
  const rotation = send().then((token) => {
    if (token && tokenStorage.get() === previousToken) tokenStorage.set(token);
    return token;
  });
  pendingRotation = rotation.catch(() => {});
  return rotation;
}

/**
 * Handles a token the server rejected (a 401 or a refused socket handshake). Resolves with `true`
 * when a token of the same account has replaced it meanwhile - the password was changed in this
 * or another tab - so the caller should retry with that one. Otherwise ends the session, if
 * `token` is still the current one.
 */
export async function recoverRejectedToken(token) {
  if (!token) return false;
  await pendingRotation;
  if (tokenStorage.get() === token) {
    await new Promise((resolve) => setTimeout(resolve, TOKEN_REPLACEMENT_GRACE_MS));
  }
  const currentToken = tokenStorage.get();
  if (currentToken === token) {
    expireSession();
    return false;
  }
  return isSameAccount(token, currentToken);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

const isCredentialRequest = (config) =>
  CREDENTIAL_ENDPOINTS.some((endpoint) => config?.url?.endsWith(endpoint));

/** The bearer token a request was sent with, or null. */
function getRequestToken(config) {
  const header = config?.headers?.get?.('Authorization') ?? config?.headers?.Authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    if (error.response?.status === 401 && !isCredentialRequest(config)) {
      // Only the current session can expire: a 401 for a request sent with an older token ends
      // nothing (e.g. right after switching accounts), and is retried once when that token was
      // rotated by a password change.
      const retry = await recoverRejectedToken(getRequestToken(config));
      if (retry && !config.isTokenRetry) return api.request({ ...config, isTokenRetry: true });
    }
    throw error;
  },
);

/**
 * Human-readable message for any error: the server's `message`, a connectivity hint when the
 * server could not be reached, or a sensible default per status code.
 */
export function getErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (axios.isAxiosError(error)) {
    const serverMessage = error.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
    if (axios.isCancel(error)) return 'The request was cancelled.';
    if (!error.response) return NETWORK_ERROR_MESSAGE; // network failure or timeout
    const { status } = error.response;
    if (status >= 500) return 'The server ran into a problem. Please try again.';
    return STATUS_MESSAGES[status] ?? fallback;
  }
  return error.message || fallback;
}

/** Server validation errors as `{ [field]: message }` (first message per field wins). */
function getFieldErrors(error) {
  const errors = error?.response?.data?.errors;
  if (!Array.isArray(errors)) return {};
  return errors.reduce((fields, item) => {
    if (item?.field && item.message && !(item.field in fields)) fields[item.field] = item.message;
    return fields;
  }, {});
}

/**
 * Pushes server validation errors into react-hook-form (focusing the first invalid field).
 * @returns {boolean} true when at least one field error was applied
 */
export function applyFieldErrors(error, setError) {
  const entries = Object.entries(getFieldErrors(error));
  entries.forEach(([field, message], index) => {
    setError(field, { type: 'server', message }, { shouldFocus: index === 0 });
  });
  return entries.length > 0;
}

/** Payload of a `{ success, data }` envelope. */
export const unwrap = (response) => response.data?.data;

/** Paginated / cursor-based list: `{ items, meta }`. */
export const unwrapPage = (response) => ({
  items: response.data?.data ?? [],
  meta: response.data?.meta ?? {},
});

/** Confirmation message of action-only endpoints (`{ success, message }`). */
export const unwrapMessage = (response) => response.data?.message ?? null;

/** Drops empty query params (undefined, null, blank strings) so they are not sent. */
export function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params ?? {})
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

/** Browser timezone offset in minutes, as expected by the API's `tzOffset` param (IST = -330). */
export const getTzOffset = () => new Date().getTimezoneOffset();

/** Tagged template that URL-encodes interpolated path segments: path`/tasks/${id}/comments`. */
export const path = (strings, ...values) =>
  strings.reduce(
    (url, segment, index) =>
      `${url}${segment}${index < values.length ? encodeURIComponent(values[index]) : ''}`,
    '',
  );
