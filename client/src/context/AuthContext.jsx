import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMe, login as loginRequest, register as registerRequest } from '@/api/auth';
import {
  AUTH_LOGOUT_EVENT,
  TOKEN_STORAGE_KEY,
  getErrorMessage,
  isSameAccount,
  tokenStorage,
} from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

const AuthContext = createContext(null);

/**
 * Session state. The JWT lives in `tokenStorage`; the signed-in user lives in the query cache
 * (`queryKeys.me`), bootstrapped from a stored token, seeded on login and updated via `setUser`.
 * Each sign-in/out starts from an empty cache so no data leaks between accounts; a new token for
 * the same account (password change, here or in another tab) keeps the session as it is.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStorage.get());
  // Mirrors `token` synchronously for event handlers (several 401s may arrive in one tick).
  const tokenRef = useRef(token);

  const applyToken = useCallback((nextToken) => {
    tokenRef.current = nextToken;
    setToken(nextToken);
  }, []);

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => getMe({ signal }),
    enabled: Boolean(token),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const user = token ? (meQuery.data ?? null) : null;
  // Only the first attempt counts as "loading": background retries after a failed bootstrap
  // (e.g. on window focus) must not cover the login page with a splash screen.
  const isLoading = Boolean(token) && meQuery.isPending && meQuery.errorUpdateCount === 0;

  // The server was unreachable while restoring the session: keep the token (a later refetch,
  // e.g. on window focus, signs the user back in) and explain why the login page is shown.
  const bootstrapError = token && !meQuery.data ? meQuery.error : null;
  useEffect(() => {
    if (bootstrapError && bootstrapError.response?.status !== 401) {
      toast.error(getErrorMessage(bootstrapError), { id: 'auth-bootstrap' });
    }
  }, [bootstrapError]);

  const startSession = useCallback(
    ({ user: nextUser, token: nextToken }) => {
      tokenStorage.set(nextToken);
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, nextUser);
      applyToken(nextToken);
      return nextUser;
    },
    [applyToken, queryClient],
  );

  const login = useCallback(
    async (credentials) => startSession(await loginRequest(credentials)),
    [startSession],
  );

  const register = useCallback(
    async (data) => startSession(await registerRequest(data)),
    [startSession],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    applyToken(null);
    queryClient.clear();
  }, [applyToken, queryClient]);

  /** Replaces the cached user (value or updater), e.g. after a profile update. */
  const setUser = useCallback(
    (nextUser) => {
      queryClient.setQueryData(queryKeys.me, nextUser);
    },
    [queryClient],
  );

  /**
   * Switches the session to a new token of the same account (after a password change) without
   * touching the user or the cache. Ignored once signed out or into another account.
   */
  const replaceToken = useCallback(
    (nextToken) => {
      if (!isSameAccount(tokenRef.current, nextToken)) return;
      tokenStorage.set(nextToken);
      applyToken(nextToken);
    },
    [applyToken],
  );

  useEffect(() => {
    // Fired by the API client on a 401 and by the socket on an authentication error.
    const handleSessionExpired = () => {
      if (!tokenRef.current) return; // already signed out: toast once
      tokenStorage.clear();
      applyToken(null);
      queryClient.clear();
      toast.error(SESSION_EXPIRED_MESSAGE, { id: 'session-expired' });
    };
    // Signed in or out in another tab: follow it with a fresh cache. A new token of the same
    // account (password changed there) just replaces this tab's one.
    const handleStorage = (event) => {
      if (event.key !== null && event.key !== TOKEN_STORAGE_KEY) return;
      const storedToken = tokenStorage.get();
      if (storedToken === tokenRef.current) return;
      if (!isSameAccount(tokenRef.current, storedToken)) queryClient.clear();
      applyToken(storedToken);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleSessionExpired);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleSessionExpired);
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyToken, queryClient]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout,
      setUser,
      replaceToken,
    }),
    [user, token, isLoading, login, register, logout, setUser, replaceToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * @returns {{ user: object | null, token: string | null, isAuthenticated: boolean,
 *   isLoading: boolean, login: (credentials: { email: string, password: string }) => Promise<object>,
 *   register: (data: { name: string, email: string, password: string }) => Promise<object>,
 *   logout: () => void, setUser: (user: object | ((user: object) => object)) => void,
 *   replaceToken: (token: string) => void }}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
