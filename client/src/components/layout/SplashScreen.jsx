import { Spinner } from '@/components/ui';
import { Logo } from './Logo';

/**
 * Full-screen branded loader shown while the session is being restored: the wordmark on paper and
 * a quiet ink spinner with a mono status line. Keep the static boot splash in index.html in step
 * with it (no fade-in), so the hand-over from HTML to React is seamless.
 */
export function SplashScreen({ label = 'Loading your workspace…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4"
    >
      <div aria-hidden="true">
        <Logo size="lg" />
      </div>
      <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
        <Spinner size="sm" className="text-fg-subtle" />
        <span>{label}</span>
      </div>
    </div>
  );
}
