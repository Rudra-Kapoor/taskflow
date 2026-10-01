import { Link, useLocation } from 'react-router-dom';
import { DueLabel } from '@/components/mytasks/DueLabel';
import { ProjectChip } from '@/components/mytasks/ProjectChip';
import { PriorityGlyph } from '@/components/tasks/TaskGlyphs';
import { EmptyState, Skeleton } from '@/components/ui';
import { getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';

/**
 * The user's next deadlines as a ruled list: mono key, priority glyph, title, project and the
 * due date right-aligned in mono. Each row opens the task.
 */
export function UpcomingTasks({ tasks = [] }) {
  const location = useLocation();

  if (tasks.length === 0) {
    return (
      <EmptyState
        compact
        title="No upcoming deadlines"
        description="You’re all caught up: nothing assigned to you is waiting."
      />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {tasks.map((task) => {
        const taskKey = getTaskKey(task);
        return (
          <li key={task._id}>
            <Link
              to={withTaskParam(task._id, location)}
              state={TASK_LINK_STATE}
              className="focus-ring group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-surface-muted/70 focus-visible:ring-offset-canvas sm:gap-4 dark:hover:bg-surface-hover/50"
            >
              <span className="hidden w-16 shrink-0 font-mono text-xs tabular-nums text-fg-muted sm:block">
                {taskKey}
              </span>
              <PriorityGlyph priority={task.priority} labelled />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg decoration-line-strong underline-offset-[3px] group-hover:underline">
                  {task.title}
                </span>
                {/* Small screens: key and project move under the title so it keeps its width. */}
                <span className="mt-0.5 flex min-w-0 items-center gap-2 sm:hidden">
                  <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">
                    {taskKey}
                  </span>
                  <ProjectChip project={task.project} />
                </span>
              </span>
              <ProjectChip project={task.project} className="hidden w-36 shrink-0 sm:inline-flex" />
              <DueLabel
                dueDate={task.dueDate}
                status={task.status}
                className="shrink-0 justify-end sm:w-24"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function UpcomingTasksSkeleton({ rows = 5 }) {
  return (
    <ul className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-4 py-[15px]">
          <Skeleton className="hidden h-3 w-12 sm:block" />
          <Skeleton className="h-3.5 w-3.5 rounded-sm" />
          <Skeleton
            className="h-3.5 flex-1"
            style={{ maxWidth: `${[60, 45, 70, 52, 58][index % 5]}%` }}
          />
          <Skeleton className="ml-auto hidden h-3 w-24 sm:block" />
          <Skeleton className="h-3 w-14" />
        </li>
      ))}
    </ul>
  );
}
