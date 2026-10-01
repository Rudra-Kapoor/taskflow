import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

/**
 * Centred spinner that fills the available area (route-level Suspense fallback).
 * Fades in after a short delay so fast loads don't flash a loader.
 */
export function PageLoader({ label = 'Loading…', className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-[50vh] flex-1 animate-fade-in flex-col items-center justify-center gap-3',
        '[animation-delay:150ms]',
        className,
      )}
    >
      <Spinner size="lg" className="text-brand-500" />
      <span className="text-[13px] text-fg-muted">{label}</span>
    </div>
  );
}
