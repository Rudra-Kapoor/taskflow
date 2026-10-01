import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Avatar, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { cn } from '@/lib/cn';

const META = 'font-mono text-[11px] uppercase leading-none tracking-[0.08em] text-fg-subtle';

/** The 404 message and ways out (dashboard or sign in, plus Back when there is history). */
function NotFoundContent({ signedIn }) {
  const navigate = useNavigate();
  const location = useLocation();
  // 'default' = first page of this tab: there is no in-app page to go back to.
  const canGoBack = location.key !== 'default';

  return (
    <div
      className={cn(
        'flex flex-1 flex-col justify-center',
        signedIn ? 'py-10' : 'px-5 py-14 sm:px-8 lg:px-10',
      )}
    >
      <div className="grid w-full animate-slide-up items-end gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div>
          <p className={cn(META, 'text-fg-muted')}>
            Error <span className="tabular-nums">404</span>
          </p>
          <h1 className="mt-5 font-display text-[length:clamp(3.5rem,8.5vw,7.5rem)] leading-[0.92] tracking-[-0.02em] text-fg">
            Lost in the
            <br />
            <em className="italic">backlog.</em>
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-fg-muted">
            There is no page at{' '}
            <code className="box-decoration-clone break-words rounded-[4px] border border-line bg-surface px-1.5 py-0.5 font-mono text-[13px] text-fg [overflow-wrap:anywhere]">
              {location.pathname}
            </code>
            . It may have moved, or it never existed.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-2">
            <Button as={Link} to={signedIn ? '/' : '/login'} size="lg">
              {signedIn ? 'Back to dashboard' : 'Back to sign in'}
            </Button>
            {canGoBack && (
              <Button variant="ghost" size="lg" icon={ArrowLeft} onClick={() => navigate(-1)}>
                Go back
              </Button>
            )}
          </div>
        </div>

        <LostCard path={location.pathname} />
      </div>
    </div>
  );
}

/** Decorative: the missing page filed as an unassigned card in a Backlog lane. */
function LostCard({ path }) {
  return (
    <div
      aria-hidden="true"
      className="hidden select-none rounded-xl bg-surface-muted p-1.5 pb-2 lg:block"
    >
      <div className="flex h-8 items-center gap-2 px-2">
        <span className="h-3 w-3 shrink-0 rounded-full border-[1.5px] border-fg-subtle" />
        <span className="font-mono text-[11px] uppercase leading-none tracking-[0.08em] text-fg">
          Backlog
        </span>
        <span className="ml-auto font-mono text-[11px] leading-none text-fg-subtle">1</span>
      </div>
      <div className="mt-0.5 rounded-lg border border-line bg-surface px-3 pb-2.5 pt-2.5 dark:bg-surface-hover">
        <span className="font-mono text-[11px] leading-none text-fg-muted">ERR-404</span>
        <p className="mt-1.5 text-sm font-medium leading-snug text-fg">Find this page</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-fg-subtle">{path}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-[4px] border border-line px-1.5 text-[11px] leading-[18px] text-fg-muted">
            routing
          </span>
          <Avatar user={null} size="sm" decorative />
        </div>
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
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:h-20 sm:px-8 lg:px-10">
        <Logo to="/" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col">
        <NotFoundContent signedIn={false} />
      </main>

      <footer
        className={cn(
          META,
          'flex h-14 shrink-0 items-center justify-between gap-4 border-t border-line px-5 sm:px-8 lg:px-10',
        )}
      >
        <span>© {new Date().getFullYear()} TaskFlow</span>
        <span>404 · Not found</span>
      </footer>
    </div>
  );
}
