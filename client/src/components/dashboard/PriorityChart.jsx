import { Link } from 'react-router-dom';
import { PriorityGlyph } from '@/components/tasks/TaskGlyphs';
import { EmptyState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TASK_PRIORITIES } from '@/lib/constants';
import { formatNumber, pluralize } from '@/lib/format';

/** Most important first. */
const PRIORITIES = [...TASK_PRIORITIES].reverse();

const priorityLink = (priority) => `/tasks?assignee=me&status=open&priority=${priority}`;

/**
 * Thin bars of the user's open tasks per priority (`{ low, medium, high, urgent }`). Each bar is
 * its share of all open tasks; rows open the matching filtered task list.
 */
export function PriorityChart({ breakdown = {} }) {
  const total = PRIORITIES.reduce((sum, priority) => sum + (breakdown[priority.value] ?? 0), 0);

  if (total === 0) {
    return (
      <EmptyState
        compact
        title="No open tasks"
        description="Nothing is assigned to you right now."
      />
    );
  }

  const pressing = (breakdown.urgent ?? 0) + (breakdown.high ?? 0);

  return (
    <div className="flex flex-1 flex-col">
      <ul>
        {PRIORITIES.map((priority) => {
          const count = breakdown[priority.value] ?? 0;
          const percent = Math.round((count / total) * 100);
          return (
            <li key={priority.value}>
              <Link
                to={priorityLink(priority.value)}
                className="focus-ring group -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-muted/70 focus-visible:ring-offset-canvas dark:hover:bg-surface-hover/50"
                aria-label={`${priority.label} priority: ${pluralize(count, 'open task')}`}
              >
                <span className="flex w-[5.25rem] shrink-0 items-center gap-2 text-[13px] text-fg-muted transition-colors group-hover:text-fg">
                  <PriorityGlyph priority={priority.value} />
                  {priority.label}
                </span>
                <span className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out',
                      priority.dot,
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-6 text-right font-mono text-[13px] tabular-nums text-fg">
                  {formatNumber(count)}
                </span>
                <span className="w-9 text-right font-mono text-xs tabular-nums text-fg-muted">
                  {percent}%
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-fg-muted">
        {pressing > 0 ? (
          <>
            <span className="font-mono tabular-nums text-fg">{formatNumber(pressing)}</span> of
            your {pluralize(total, 'open task')} {pressing === 1 ? 'is' : 'are'} high priority or
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
    <div className="space-y-1" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex h-9 items-center gap-3">
          <Skeleton className="h-3 w-[4.5rem]" />
          <Skeleton className="h-1 flex-1 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
