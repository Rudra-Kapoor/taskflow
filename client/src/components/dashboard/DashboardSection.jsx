import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Dashboard section set straight on the paper: a title (optional one-line description) ruled
 * off by a hairline, with an optional `meta` figure and `action` link on the right.
 */
export function DashboardSection({ title, description, meta, action, className, children }) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={cn('flex min-w-0 flex-col', className)}>
      <header className="flex items-end justify-between gap-4 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.005em] text-fg">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
        </div>
        {(meta || action) && (
          <div className="flex shrink-0 items-center gap-4">
            {meta}
            {action}
          </div>
        )}
      </header>
      <div className="flex flex-1 flex-col pt-3">{children}</div>
    </section>
  );
}

/** Quiet "View all →" text link for a section header (36px tall hit area). */
export function SectionLink({ to, children = 'View all' }) {
  return (
    <Link
      to={to}
      className="focus-ring group -my-2 inline-flex items-center gap-1 rounded-sm py-2 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg focus-visible:ring-offset-canvas"
    >
      {children}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
