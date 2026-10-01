import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/cn';
import { Button } from './Button';

const DEFAULT_MESSAGE = 'Please try again in a moment.';

/**
 * Error placeholder with the server / network message (or `description`) and an optional retry
 * button (`retryLabel` defaults to "Try again").
 */
export function ErrorState({
  title = 'Something went wrong',
  error,
  description,
  onRetry,
  retryLabel = 'Try again',
  compact = false,
  className,
}) {
  const message = description ?? getErrorMessage(error, DEFAULT_MESSAGE);

  return (
    <div
      role="alert"
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset',
          'ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20',
          compact ? 'h-10 w-10' : 'h-12 w-12',
        )}
      >
        <AlertTriangle className={compact ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} className="mt-5">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
