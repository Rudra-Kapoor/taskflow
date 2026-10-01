import { useState } from 'react';
import { EmptyState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TASK_STATUSES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

const percentOf = (count, total) => (total ? Math.round((count / total) * 100) : 0);

/**
 * Task counts per status (`{ todo, in_progress, completed }`) as one stacked hairline bar with a
 * mono legend that always lists every value; hovering a segment or legend row brings it forward.
 */
export function StatusChart({ breakdown = {} }) {
  const [activeStatus, setActiveStatus] = useState(null);
  const total = TASK_STATUSES.reduce((sum, status) => sum + (breakdown[status.value] ?? 0), 0);

  if (total === 0) {
    return (
      <EmptyState
        compact
        title="No tasks yet"
        description="Task counts per status appear here once your projects have tasks."
      />
    );
  }

  const summary = TASK_STATUSES.map(
    (status) => `${breakdown[status.value] ?? 0} ${status.label}`,
  ).join(', ');
  const dimmed = (value) => activeStatus && activeStatus !== value;

  return (
    <div className="pt-1">
      <p className="flex items-baseline justify-between gap-3 text-xs text-fg-muted">
        <span>
          <span className="font-mono tabular-nums text-fg">{formatNumber(total)}</span>{' '}
          {total === 1 ? 'task' : 'tasks'} in total
        </span>
        <span>
          <span className="font-mono tabular-nums text-fg">
            {percentOf(breakdown.completed ?? 0, total)}%
          </span>{' '}
          completed
        </span>
      </p>

      <div
        role="img"
        aria-label={`Tasks by status: ${summary}`}
        className="mt-3 flex h-2 w-full gap-0.5"
        onMouseLeave={() => setActiveStatus(null)}
      >
        {TASK_STATUSES.map((status) => {
          const count = breakdown[status.value] ?? 0;
          if (!count) return null;
          return (
            <span
              key={status.value}
              title={`${status.label}: ${count}`}
              onMouseEnter={() => setActiveStatus(status.value)}
              className={cn(
                'h-full min-w-[3px] rounded-[2px] transition-opacity duration-200',
                status.dot,
                dimmed(status.value) && 'opacity-25',
              )}
              style={{ flexGrow: count, flexBasis: 0 }}
            />
          );
        })}
      </div>

      <ul className="mt-4">
        {TASK_STATUSES.map((status) => {
          const count = breakdown[status.value] ?? 0;
          return (
            <li
              key={status.value}
              onMouseEnter={() => setActiveStatus(status.value)}
              onMouseLeave={() => setActiveStatus(null)}
              className={cn(
                '-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                activeStatus === status.value && 'bg-surface-muted/70 dark:bg-surface-hover/50',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('h-2 w-2 shrink-0 rounded-[2px]', status.dot)}
              />
              <span className="flex-1 text-fg-muted">{status.label}</span>
              <span className="font-mono tabular-nums text-fg">{formatNumber(count)}</span>
              <span className="w-10 text-right font-mono text-xs tabular-nums text-fg-muted">
                {percentOf(count, total)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatusChartSkeleton() {
  return (
    <div className="pt-1" aria-hidden="true">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="mt-3 h-2 w-full rounded-[2px]" />
      <div className="mt-4 space-y-1">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex h-8 items-center gap-3">
            <Skeleton className="h-2 w-2 rounded-[2px]" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
