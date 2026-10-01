import { cn } from '@/lib/cn';

/** Thin indeterminate bar along the top edge of a panel while it refreshes in the background. */
export function LoadingBar({ active, className }) {
  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Updating results"
      className={cn('pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden', className)}
    >
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
    </div>
  );
}
