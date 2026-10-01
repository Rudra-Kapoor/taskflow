import { Link, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { PriorityGlyph, StatusLabel } from '@/components/tasks/TaskGlyphs';
import { Avatar, LabelChip, TimeAgo } from '@/components/ui';
import { useTaskModal } from '@/hooks/useTaskModal';
import { cn } from '@/lib/cn';
import { PRIORITY_META } from '@/lib/constants';
import { getFirstName, getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';
import { DueLabel } from './DueLabel';
import { ProjectChip } from './ProjectChip';

const MAX_LABELS = 3;

/** Column headings: small mono capitals. */
const TH = 'py-2.5 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-fg-muted';
/** Every cell sits on the first line of the title, so a row reads along one baseline. */
const TD = 'py-3 align-top leading-5';
/** A 20px line box (the title's first line) that centres a cell's content. */
const LINE = 'flex h-5 items-center';

/** Priority glyph + name ("▮▮▮ High"). */
export function PriorityLabel({ priority, className }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;
  return (
    <span
      className={cn('inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-fg-muted', className)}
    >
      <PriorityGlyph priority={priority} />
      {meta.label}
      <span className="sr-only"> priority</span>
    </span>
  );
}

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
        <span
          className="font-mono text-[11px] tabular-nums text-fg-muted"
          title={labels.join(', ')}
        >
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
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="border-b border-line">
          <tr>
            <th scope="col" className={cn(TH, 'w-[5.5rem] pl-5 pr-3')}>
              Key
            </th>
            <th scope="col" className={cn(TH, 'px-3')}>
              Task
            </th>
            <th scope="col" className={cn(TH, 'hidden px-3 xl:table-cell')}>
              Project
            </th>
            <th scope="col" className={cn(TH, 'px-3')}>
              Status
            </th>
            <th scope="col" className={cn(TH, 'px-3')}>
              Priority
            </th>
            <th scope="col" className={cn(TH, 'px-3')}>
              Assignee
            </th>
            <th scope="col" className={cn(TH, 'hidden px-3 text-right xl:table-cell')}>
              Updated
            </th>
            <th scope="col" className={cn(TH, 'pl-3 pr-5 text-right')}>
              Due
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
              className="group cursor-pointer transition-colors hover:bg-surface-hover/50"
            >
              <td className={cn(TD, 'whitespace-nowrap pl-5 pr-3')}>
                <span className={cn(LINE, 'font-mono text-xs tabular-nums text-fg-muted')}>
                  {getTaskKey(task)}
                </span>
              </td>
              <td className={cn(TD, 'w-full max-w-0 px-3')}>
                <div className="flex min-w-0 items-start gap-2.5">
                  <Link
                    to={withTaskParam(task._id, location)}
                    state={TASK_LINK_STATE}
                    className="focus-ring line-clamp-2 min-w-0 break-words rounded-sm font-medium text-fg decoration-line-strong underline-offset-[3px] hover:underline"
                  >
                    {task.title}
                  </Link>
                  {task.commentCount > 0 && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 pt-px font-mono text-[11px] tabular-nums text-fg-subtle"
                      title={`${task.commentCount} comments`}
                    >
                      <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      {task.commentCount}
                    </span>
                  )}
                </div>
                {/* Project (until it gets its own column) and labels. */}
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
              <td className={cn(TD, 'hidden max-w-[11rem] px-3 xl:table-cell')}>
                <ProjectChip project={task.project} className="max-w-full text-[13px]" />
              </td>
              <td className={cn(TD, 'whitespace-nowrap px-3')}>
                <StatusLabel
                  status={task.status}
                  className={cn(LINE, 'text-[13px] text-fg-muted')}
                />
              </td>
              <td className={cn(TD, 'whitespace-nowrap px-3')}>
                <PriorityLabel priority={task.priority} className={LINE} />
              </td>
              <td className={cn(TD, 'whitespace-nowrap px-3')}>
                <span className="-my-0.5 flex items-center gap-2">
                  <Avatar user={task.assignee} size="sm" showTooltip />
                  <span className="hidden max-w-[6rem] truncate text-[13px] text-fg-muted xl:inline">
                    {task.assignee ? getFirstName(task.assignee.name) : 'Unassigned'}
                  </span>
                </span>
              </td>
              <td
                className={cn(
                  TD,
                  'hidden whitespace-nowrap px-3 text-right text-xs text-fg-subtle xl:table-cell',
                )}
              >
                <span className={cn(LINE, 'justify-end')}>
                  <TimeAgo date={task.updatedAt} />
                </span>
              </td>
              <td className={cn(TD, 'whitespace-nowrap pl-3 pr-5 text-right')}>
                <DueLabel
                  dueDate={task.dueDate}
                  status={task.status}
                  className={cn(LINE, 'justify-end')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
