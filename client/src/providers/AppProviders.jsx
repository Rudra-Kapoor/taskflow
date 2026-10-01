import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { queryClient } from '@/lib/queryClient';

/**
 * Data-layer providers: server cache > session > real-time connection.
 * Rendered inside <BrowserRouter> (the socket handlers navigate on deep links / deletions).
 */
export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>{children}</SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
