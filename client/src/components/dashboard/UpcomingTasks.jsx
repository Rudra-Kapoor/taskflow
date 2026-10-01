import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import { DueLabel } from '@/components/mytasks/DueLabel';
import { ProjectChip } from '@/components/mytasks/ProjectChip';
import { EmptyState, PriorityBadge, Skeleton } from '@/components/ui';
import { getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';

/** The user's next deadlines; each row opens the task. */
export function UpcomingTasks({ tasks = [] }) {
  const location = useLocation();

  if (tasks.length === 0) {
    return (
      <EmptyState
        compact
        icon={CalendarCheck}
        title="No upcoming deadlines"
        description="You’re all caught up: nothing assigned to you is waiting."
      />
    );
  }

  return (
    <ul className="-mx-2 space-y-0.5">
      {tasks.map((task) => (
        <li key={task._id}>
          <Link
            to={withTaskParam(task._id, location)}
            state={TASK_LINK_STATE}
            className="focus-ring group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-hover"
          >
            <PriorityBadge priority={task.priority} showLabel={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg group-hover:text-brand-700 dark:group-hover:text-brand-300">
                {task.title}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-mono text-2xs font-medium text-fg-muted">
                  {getTaskKey(task)}
                </span>
                <ProjectChip project={task.project} />
                {/* Small screens: the due date joins this line so the title keeps its width. */}
                <DueLabel
                  dueDate={task.dueDate}
                  status={task.status}
                  className="ml-auto shrink-0 sm:hidden"
                />
              </div>
            </div>
            <DueLabel
              dueDate={task.dueDate}
              status={task.status}
              className="hidden shrink-0 sm:inline-flex"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function UpcomingTasksSkeleton({ rows = 5 }) {
  return (
    <ul className="space-y-4 py-1" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5" style={{ width: `${[70, 55, 80, 60, 65][index % 5]}%` }} />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3.5 w-16" />
        </li>
      ))}
    </ul>
  );
}
