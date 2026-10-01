import { cn } from '@/lib/cn';
import { renderIcon } from './renderIcon';

/**
 * Friendly placeholder for empty lists / searches.
 * `icon` accepts a lucide component or an element; `action` is any node (usually a Button).
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
            'mb-4 flex items-center justify-center rounded-2xl bg-brand-50 text-brand-600',
            'ring-1 ring-inset ring-brand-600/10 dark:bg-brand-500/10 dark:text-brand-300',
            'dark:ring-brand-400/20',
            compact
              ? 'h-10 w-10'
              : 'h-12 w-12 shadow-[0_0_0_6px_rgb(99_102_241/0.06)] dark:shadow-[0_0_0_6px_rgb(99_102_241/0.08)]',
          )}
        >
          {renderIcon(icon, compact ? 'h-5 w-5' : 'h-6 w-6')}
        </div>
      )}
      {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
