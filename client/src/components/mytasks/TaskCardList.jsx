import { Link, useLocation } from 'react-router-dom';
import { Avatar, PriorityBadge, StatusBadge } from '@/components/ui';
import { getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';
import { DueLabel } from './DueLabel';
import { ProjectChip } from './ProjectChip';
import { TaskLabels } from './TaskTable';

/** Compact task results for small screens; each card opens the task. */
export function TaskCardList({ tasks }) {
  const location = useLocation();

  return (
    <ul className="divide-y divide-line">
      {tasks.map((task) => (
        <li key={task._id}>
          <Link
            to={withTaskParam(task._id, location)}
            state={TASK_LINK_STATE}
            className="focus-ring block px-4 py-3.5 transition-colors hover:bg-surface-hover/70 sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-mono text-xs font-medium text-fg-muted">
                {getTaskKey(task)}
              </span>
              <ProjectChip project={task.project} />
              <Avatar user={task.assignee} size="sm" showTooltip className="ml-auto" />
            </div>
            <p className="mt-1.5 line-clamp-2 break-words text-sm font-medium leading-snug text-fg">
              {task.title}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <StatusBadge status={task.status} size="sm" />
              <PriorityBadge priority={task.priority} size="sm" />
              <DueLabel dueDate={task.dueDate} status={task.status} showEmpty={false} />
              <TaskLabels labels={task.labels} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
