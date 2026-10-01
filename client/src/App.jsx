import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { ErrorBoundary } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { lazyNamed } from '@/lib/lazy';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute';

// Pages are code-split; `lazyNamed` recovers from stale chunks after a redeploy.
const LoginPage = lazyNamed(() => import('@/pages/LoginPage'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('@/pages/RegisterPage'), 'RegisterPage');
const DashboardPage = lazyNamed(() => import('@/pages/DashboardPage'), 'DashboardPage');
const MyTasksPage = lazyNamed(() => import('@/pages/MyTasksPage'), 'MyTasksPage');
const ProjectsPage = lazyNamed(() => import('@/pages/ProjectsPage'), 'ProjectsPage');
const ProjectBoardPage = lazyNamed(() => import('@/pages/ProjectBoardPage'), 'ProjectBoardPage');
const TeamsPage = lazyNamed(() => import('@/pages/TeamsPage'), 'TeamsPage');
const TeamDetailPage = lazyNamed(() => import('@/pages/TeamDetailPage'), 'TeamDetailPage');
const NotificationsPage = lazyNamed(() => import('@/pages/NotificationsPage'), 'NotificationsPage');
const ProfilePage = lazyNamed(() => import('@/pages/ProfilePage'), 'ProfilePage');
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');

export function App() {
  return (
    <>
      <ErrorBoundary className="min-h-screen bg-canvas px-4">
        <Suspense fallback={<SplashScreen label="Loading…" />}>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tasks" element={<MyTasksPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:projectId" element={<ProjectBoardPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/teams/:teamId" element={<TeamDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundRoute />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <AppToaster />
    </>
  );
}

/** Unknown URLs: inside the app shell for signed-in users, a standalone page for guests. */
function NotFoundRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return <NotFoundPage />;
  return (
    <AppLayout>
      <NotFoundPage />
    </AppLayout>
  );
}

/**
 * Toasts themed with the design tokens (CSS variables follow light / dark mode): a flat surface
 * with a hairline, the popover shadow and status-coloured icons (green / red, ink spinner). They
 * sit at the bottom (right on desktop, centred above the safe area on phones), away from page
 * headers, dialog headers and the activity panel's close button.
 */
function AppToaster() {
  const isDesktop = useMediaQuery('(min-width: 640px)');

  return (
    <Toaster
      position={isDesktop ? 'bottom-right' : 'bottom-center'}
      gutter={10}
      containerStyle={
        isDesktop
          ? { bottom: 24, right: 24 }
          : { bottom: 'max(12px, env(safe-area-inset-bottom))', left: 12, right: 12 }
      }
      toastOptions={{
        duration: 4000,
        style: {
          background: 'rgb(var(--color-surface))',
          color: 'rgb(var(--color-fg))',
          border: '1px solid rgb(var(--color-line-strong) / 0.7)',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px rgb(0 0 0 / 0.10)',
          fontSize: '13px',
          lineHeight: '1.45',
          padding: '9px 12px',
          maxWidth: '420px',
        },
        success: { iconTheme: { primary: '#2F8F5B', secondary: '#ffffff' } },
        error: { duration: 5000, iconTheme: { primary: '#E5484D', secondary: '#ffffff' } },
        loading: {
          iconTheme: { primary: 'rgb(var(--color-fg))', secondary: 'rgb(var(--color-line))' },
        },
      }}
    />
  );
}
