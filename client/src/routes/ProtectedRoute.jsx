import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { useAuth } from '@/context/AuthContext';
import { buildLoginRedirect } from './redirect';

/**
 * Renders its children (or nested routes) only for signed-in users. Waits for the session to be
 * restored, then sends guests to `/login?redirect=<where they wanted to go>`.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return <Navigate to={buildLoginRedirect(location)} replace />;

  return children ?? <Outlet />;
}
