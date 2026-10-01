import { cn } from '@/lib/cn';
import { renderIcon } from './renderIcon';

/**
 * Quiet placeholder for empty lists / searches: a short serif headline, one line of copy and one
 * action. `icon` (a lucide component or an element) is drawn as a tiny line icon, never a tile.
 */
export function EmptyState({ icon, title, description, action, compact = false, className }) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center text-fg-subtle',
            compact ? 'mb-2.5' : 'mb-3.5',
          )}
        >
          {renderIcon(icon, compact ? 'h-4 w-4' : 'h-5 w-5')}
        </div>
      )}
      {title && (
        <h3
          className={cn(
            'font-display font-normal leading-[1.15] tracking-[-0.005em] text-fg',
            compact ? 'text-[21px]' : 'text-[26px]',
          )}
        >
          {title}
        </h3>
      )}
      {description && (
        <p className={cn('max-w-sm text-sm text-fg-muted', compact ? 'mt-1' : 'mt-1.5')}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
