import { QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 800;

/**
 * Retries a transient failure - network error, timeout or 5xx response - once, shortly after,
 * so an error state shows quickly. Client errors (4xx) are deterministic and programming errors
 * are not transient: never retried.
 */
function shouldRetryRequest(failureCount, error) {
  if (failureCount >= MAX_RETRIES || !error?.isAxiosError) return false;
  if (error.code === 'ERR_CANCELED') return false;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

/** The app-wide client (also handed to the real-time handlers). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: shouldRetryRequest,
      retryDelay: RETRY_DELAY_MS,
      refetchOnWindowFocus: true,
      // Back online, the socket reconnects and refetches everything (SocketContext resync).
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
