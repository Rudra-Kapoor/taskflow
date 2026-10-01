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
      <AlertTriangle
        className={cn('text-danger', compact ? 'mb-2.5 h-4 w-4' : 'mb-3.5 h-5 w-5')}
        aria-hidden="true"
      />
      <h3
        className={cn(
          'font-display font-normal leading-[1.15] tracking-[-0.005em] text-fg',
          compact ? 'text-[21px]' : 'text-[26px]',
        )}
      >
        {title}
      </h3>
      <p className={cn('max-w-sm text-sm text-fg-muted', compact ? 'mt-1' : 'mt-1.5')}>
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} className="mt-5">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
