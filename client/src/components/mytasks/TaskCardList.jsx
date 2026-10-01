import { Link, useLocation } from 'react-router-dom';
import { StatusLabel } from '@/components/tasks/TaskGlyphs';
import { Avatar } from '@/components/ui';
import { getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';
import { DueLabel } from './DueLabel';
import { ProjectChip } from './ProjectChip';
import { PriorityLabel, TaskLabels } from './TaskTable';

/** Compact task results for small screens; each row opens the task. */
export function TaskCardList({ tasks }) {
  const location = useLocation();

  return (
    <ul className="divide-y divide-line">
      {tasks.map((task) => (
        <li key={task._id}>
          <Link
            to={withTaskParam(task._id, location)}
            state={TASK_LINK_STATE}
            className="focus-ring block px-4 py-3.5 transition-colors hover:bg-surface-hover/50 sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">
                {getTaskKey(task)}
              </span>
              <ProjectChip project={task.project} />
              <DueLabel
                dueDate={task.dueDate}
                status={task.status}
                showEmpty={false}
                className="ml-auto shrink-0"
              />
            </div>
            <p className="mt-1.5 line-clamp-2 break-words text-sm font-medium leading-snug text-fg">
              {task.title}
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                <StatusLabel status={task.status} className="text-xs text-fg-muted" />
                <PriorityLabel priority={task.priority} className="text-xs" />
                <TaskLabels labels={task.labels} />
              </div>
              <Avatar user={task.assignee} size="sm" showTooltip className="shrink-0" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
