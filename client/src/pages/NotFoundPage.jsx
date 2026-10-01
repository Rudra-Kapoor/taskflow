import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, LogIn } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';

/** The 404 message and ways out (dashboard or sign in, plus Back when there is history). */
function NotFoundContent({ signedIn }) {
  const navigate = useNavigate();
  const location = useLocation();
  // 'default' = first page of this tab: there is no in-app page to go back to.
  const canGoBack = location.key !== 'default';

  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl"
      />
      <p className="text-gradient animate-scale-in select-none text-[7rem] font-bold leading-none tracking-tighter sm:text-[10rem]">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        This page wandered off the board
      </h1>
      <p className="mt-3 max-w-md text-sm text-fg-muted sm:text-base">
        The page you’re looking for doesn’t exist or may have been moved. Let’s get you back
        on track.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {signedIn ? (
          <Button as={Link} to="/" icon={LayoutDashboard} size="lg">
            Go to dashboard
          </Button>
        ) : (
          <Button as={Link} to="/login" icon={LogIn} size="lg">
            Sign in
          </Button>
        )}
        {canGoBack && (
          <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Go back
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Catch-all route. Signed-in users see it inside the app shell (navigation stays available);
 * guests get a standalone page with the logo and theme switch.
 */
export function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  useDocumentTitle('Page not found');

  if (isAuthenticated) return <NotFoundContent signedIn />;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="bg-dot-grid-muted absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />

      <header className="relative flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <Logo to="/" />
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 flex-col pb-12">
        <NotFoundContent signedIn={false} />
      </main>
    </div>
  );
}
