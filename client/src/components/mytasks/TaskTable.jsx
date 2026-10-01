import { Link, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Avatar, LabelChip, PriorityBadge, StatusBadge, TimeAgo } from '@/components/ui';
import { useTaskModal } from '@/hooks/useTaskModal';
import { cn } from '@/lib/cn';
import { getFirstName, getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';
import { DueLabel } from './DueLabel';
import { ProjectChip } from './ProjectChip';

const MAX_LABELS = 3;

/** Labels of a task (first few + "+N"). */
export function TaskLabels({ labels = [] }) {
  if (labels.length === 0) return null;
  const hidden = labels.length - MAX_LABELS;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {labels.slice(0, MAX_LABELS).map((label) => (
        <LabelChip key={label} label={label} />
      ))}
      {hidden > 0 && (
        <span className="text-[11px] font-medium text-fg-muted" title={labels.join(', ')}>
          +{hidden}
        </span>
      )}
    </span>
  );
}

/**
 * Desktop task results. The whole row opens the task (the title is the keyboard-focusable link);
 * the Project and Updated columns appear on wide screens.
 */
export function TaskTable({ tasks }) {
  const location = useLocation();
  const { openTask } = useTaskModal();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <thead className="border-b border-line bg-surface-muted/60">
          <tr className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
            <th scope="col" className="py-2.5 pl-5 pr-3 font-semibold">
              Task
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold xl:table-cell">
              Project
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Status
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Priority
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Assignee
            </th>
            {/* Last column until "Updated" appears: it takes the table's edge padding. */}
            <th scope="col" className="py-2.5 pl-3 pr-5 font-semibold xl:pr-3">
              Due
            </th>
            <th
              scope="col"
              className="hidden py-2.5 pl-3 pr-5 text-right font-semibold xl:table-cell"
            >
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tasks.map((task) => (
            <tr
              key={task._id}
              onClick={(event) => {
                if (event.target.closest('a, button')) return;
                openTask(task._id);
              }}
              className="group cursor-pointer transition-colors hover:bg-surface-hover/70"
            >
              <td className="w-full max-w-0 py-3 pl-5 pr-3">
                <div className="flex min-w-0 items-baseline gap-2.5">
                  <span className="shrink-0 font-mono text-xs font-medium text-fg-muted">
                    {getTaskKey(task)}
                  </span>
                  <Link
                    to={withTaskParam(task._id, location)}
                    state={TASK_LINK_STATE}
                    className="focus-ring line-clamp-2 min-w-0 break-words rounded font-medium text-fg transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300"
                  >
                    {task.title}
                  </Link>
                  {task.commentCount > 0 && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 self-start pt-0.5 text-xs text-fg-muted"
                      title={`${task.commentCount} comments`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      {task.commentCount}
                    </span>
                  )}
                </div>
                {/* Project chip (until it gets its own column) and labels. */}
                <div
                  className={cn(
                    'mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1',
                    !task.labels?.length && 'xl:hidden',
                  )}
                >
                  <ProjectChip project={task.project} className="max-w-[12rem] xl:hidden" />
                  <TaskLabels labels={task.labels} />
                </div>
              </td>
              <td className="hidden max-w-[11rem] px-3 py-3 xl:table-cell">
                <ProjectChip project={task.project} className="max-w-full text-[13px]" />
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <StatusBadge status={task.status} size="sm" />
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <PriorityBadge priority={task.priority} size="sm" />
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <span className="flex items-center gap-2">
                  <Avatar user={task.assignee} size="sm" showTooltip />
                  <span className="hidden max-w-[6rem] truncate text-[13px] text-fg-muted xl:inline">
                    {task.assignee ? getFirstName(task.assignee.name) : 'Unassigned'}
                  </span>
                </span>
              </td>
              <td className="whitespace-nowrap py-3 pl-3 pr-5 xl:pr-3">
                <DueLabel dueDate={task.dueDate} status={task.status} />
              </td>
              <td className="hidden whitespace-nowrap py-3 pl-3 pr-5 text-right text-xs text-fg-muted xl:table-cell">
                <TimeAgo date={task.updatedAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
