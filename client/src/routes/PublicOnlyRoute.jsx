import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { useAuth } from '@/context/AuthContext';
import { getSafeRedirect } from './redirect';

/**
 * Pages for guests only (login / register). Signed-in users go to the `?redirect=` target or home.
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();

  if (isLoading) return <SplashScreen label="Loading…" />;
  if (isAuthenticated) {
    return <Navigate to={getSafeRedirect(searchParams.get('redirect'))} replace />;
  }

  return children ?? <Outlet />;
}
