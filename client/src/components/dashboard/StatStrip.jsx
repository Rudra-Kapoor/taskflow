import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

/**
 * Hairlines and padding per figure: a 2 x 2 ledger on phones, one row of four from `md`. The
 * outer figures sit flush with the page edges so the numerals line up with the title.
 */
const CELL_LAYOUT = [
  'border-b border-r pr-4 md:border-b-0 md:pr-6',
  'border-b pl-4 md:border-b-0 md:border-r md:px-6',
  'border-r pr-4 md:px-6',
  'pl-4 md:pl-6',
];

/**
 * The dashboard's headline figures as one ruled row of large serif numerals, each linking to the
 * matching task list. `items`: `{ label, value, hint, alert, to }`; `alert` sets the numeral in
 * the danger tone (e.g. overdue work). Skeleton figures while `loading`.
 */
export function StatStrip({ items = [], loading = false }) {
  return (
    <div className="grid grid-cols-2 border-y border-line md:grid-cols-4">
      {loading
        ? CELL_LAYOUT.map((layout) => <StatSkeleton key={layout} className={layout} />)
        : items.map((item, index) => (
            <Stat key={item.label} {...item} className={CELL_LAYOUT[index]} />
          ))}
    </div>
  );
}

function Stat({ label, value, hint, alert = false, to, className }) {
  return (
    <Link
      to={to}
      className={cn(
        'focus-ring group relative flex min-w-0 flex-col border-line py-5 focus-visible:ring-offset-canvas sm:py-6',
        className,
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="eyebrow truncate transition-colors duration-150 group-hover:text-fg">
          {label}
        </span>
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        />
      </span>
      <span
        className={cn(
          'mt-4 font-display text-[44px] leading-none tracking-[-0.01em] sm:text-[52px]',
          alert ? 'text-danger' : 'text-fg',
        )}
      >
        {formatNumber(value)}
      </span>
      <span className="mt-3 truncate text-xs text-fg-muted">{hint}</span>
    </Link>
  );
}

function StatSkeleton({ className }) {
  return (
    <div className={cn('border-line py-5 sm:py-6', className)} aria-hidden="true">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-10 w-12 sm:h-12" />
      <Skeleton className="mt-3 h-3 w-24" />
    </div>
  );
}
