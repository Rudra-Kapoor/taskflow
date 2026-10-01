import { Component } from 'react';
import { cn } from '@/lib/cn';
import { isChunkLoadError } from '@/lib/lazy';
import { ErrorState } from './ErrorState';

const reloadPage = () => window.location.reload();

/** What a crashed view shows: a calm explanation and a reload button (no stack traces). */
export function ErrorFallback({ error, compact = false, className }) {
  const outdated = isChunkLoadError(error);
  return (
    <div className={cn('flex flex-1 items-center justify-center', className)}>
      <ErrorState
        compact={compact}
        title={outdated ? 'TaskFlow has been updated' : 'Something went wrong'}
        description={
          outdated
            ? 'Part of the app could not be loaded. Reload the page to get the latest version.'
            : 'An unexpected error stopped this view from loading. Reloading usually fixes it.'
        }
        onRetry={reloadPage}
        retryLabel="Reload"
      />
    </div>
  );
}

/**
 * Catches render errors (and failed lazy imports) below it and shows `ErrorFallback` instead of a
 * blank screen. `fallback(error)` customises the output; remount it with a new `key` (e.g. the
 * pathname) to recover once the user moves on.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    const { fallback, className, children } = this.props;
    if (!error) return children;
    return fallback ? fallback(error) : <ErrorFallback error={error} className={className} />;
  }
}
