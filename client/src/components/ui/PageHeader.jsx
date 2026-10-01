import { cn } from '@/lib/cn';
import { renderIcon } from './renderIcon';

/**
 * Page title row: optional icon tile, title, description and right-aligned actions.
 * `children` render as an extra row below (filters, tabs, …).
 */
export function PageHeader({ title, description, actions, icon, className, children }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:mb-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {icon && (
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-brand-600 shadow-xs xs:flex dark:text-brand-300">
              {renderIcon(icon, 'h-5 w-5')}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-fg sm:text-2xl">
              {title}
            </h1>
            {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
