import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

/** Icon tile, corner glow and (for alerts) value / hint colours per tone. */
const TONES = {
  brand: {
    tile: 'bg-brand-50 text-brand-600 ring-brand-600/10 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20',
    glow: 'bg-brand-500',
  },
  rose: {
    tile: 'bg-rose-50 text-rose-600 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    glow: 'bg-rose-500',
    value: 'text-rose-600 dark:text-rose-400',
    hint: 'text-rose-600 dark:text-rose-400',
  },
  amber: {
    tile: 'bg-amber-50 text-amber-600 ring-amber-600/10 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
    glow: 'bg-amber-500',
  },
  emerald: {
    tile: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    glow: 'bg-emerald-500',
  },
  neutral: {
    tile: 'bg-surface-muted text-fg-muted ring-line',
    glow: 'bg-slate-400',
  },
};

/** Headline number that links to the matching task list (dashboard KPI row). */
export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', to }) {
  const styles = TONES[tone] ?? TONES.brand;

  return (
    <Link
      to={to}
      className="card focus-ring group relative isolate flex min-w-0 flex-col overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md sm:p-5"
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 -z-10 h-28 w-28 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.15]',
          styles.glow,
        )}
      />
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
            styles.tile,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="line-clamp-1 min-w-0 flex-1 text-sm font-medium text-fg">{label}</p>
      </div>
      {/* The hover arrow sits on the number row, so the label keeps the full width. */}
      <div className="mt-3.5 flex items-end justify-between gap-2">
        <p
          className={cn(
            'text-[1.75rem] font-semibold leading-none tracking-tight sm:text-3xl',
            styles.value ?? 'text-fg',
          )}
        >
          {formatNumber(value)}
        </p>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-fg-subtle opacity-0 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        />
      </div>
      <p className={cn('mt-2 truncate text-xs', styles.hint ?? 'text-fg-muted')}>{hint}</p>
    </Link>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mt-3.5 h-7 w-12" />
      <Skeleton className="mt-2.5 h-3 w-20" />
    </div>
  );
}
