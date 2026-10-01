import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { EmptyState, PriorityBadge, Skeleton } from '@/components/ui';
import { TASK_PRIORITIES } from '@/lib/constants';
import { formatNumber, pluralize } from '@/lib/format';

/** Most important first. */
const PRIORITIES = [...TASK_PRIORITIES].reverse();

const priorityLink = (priority) => `/tasks?assignee=me&status=open&priority=${priority}`;

/**
 * Horizontal bars of the user's open tasks per priority (`{ low, medium, high, urgent }`). Each
 * bar is its share of all open tasks; rows open the matching filtered task list.
 */
export function PriorityChart({ breakdown = {} }) {
  const total = PRIORITIES.reduce((sum, priority) => sum + (breakdown[priority.value] ?? 0), 0);

  if (total === 0) {
    return (
      <EmptyState
        compact
        icon={CheckCircle2}
        title="No open tasks"
        description="Nothing is assigned to you right now. Enjoy the calm!"
      />
    );
  }

  const pressing = (breakdown.urgent ?? 0) + (breakdown.high ?? 0);

  return (
    <div className="flex flex-1 flex-col">
      <ul className="-mx-2 mb-4 flex flex-1 flex-col justify-around gap-1">
        {PRIORITIES.map((priority) => {
          const count = breakdown[priority.value] ?? 0;
          const percent = Math.round((count / total) * 100);
          return (
            <li key={priority.value}>
              <Link
                to={priorityLink(priority.value)}
                className="focus-ring group block rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
                aria-label={`${priority.label} priority: ${pluralize(count, 'open task')}`}
              >
                <div className="flex items-center gap-2.5">
                  <PriorityBadge priority={priority.value} showLabel={false} size="sm" />
                  <span className="flex-1 text-sm text-fg-muted group-hover:text-fg">
                    {priority.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-fg">
                    {formatNumber(count)}
                  </span>
                  <span className="w-9 text-right text-xs tabular-nums text-fg-muted">
                    {percent}%
                  </span>
                </div>
                <div className="ml-[1.875rem] mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${percent}%`, backgroundColor: priority.color }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-auto border-t border-line pt-4 text-xs text-fg-muted">
        {pressing > 0 ? (
          <>
            <span className="font-semibold text-fg">{formatNumber(pressing)}</span> of your{' '}
            {pluralize(total, 'open task')} {pressing === 1 ? 'is' : 'are'} high priority or
            urgent.
          </>
        ) : (
          <>Nothing high priority or urgent on your plate.</>
        )}
      </p>
    </div>
  );
}

export function PriorityChartSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-8" />
          </div>
          <Skeleton className="ml-[1.875rem] h-2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
