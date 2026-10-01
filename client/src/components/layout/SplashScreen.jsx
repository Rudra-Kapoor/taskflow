import { SquareKanban } from 'lucide-react';
import { Spinner } from '@/components/ui';

/**
 * Full-screen branded loader shown while the session is being restored. Matches the static boot
 * splash in index.html (no fade-in), so the hand-over from HTML to React is seamless.
 */
export function SplashScreen({ label = 'Loading your workspace…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4"
    >
      <div className="relative" aria-hidden="true">
        <span className="absolute -inset-4 animate-pulse rounded-[28px] bg-brand-500/20 blur-xl" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-600/30 ring-1 ring-inset ring-white/10">
          <SquareKanban className="h-7 w-7 text-white" strokeWidth={2.25} />
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-sm text-fg-muted">
        <Spinner size="sm" className="text-brand-500" />
        <span>{label}</span>
      </div>
    </div>
  );
}
