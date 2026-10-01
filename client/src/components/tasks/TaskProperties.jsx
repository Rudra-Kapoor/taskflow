import { Avatar, TimeAgo } from '@/components/ui';
import { useBatchedSave } from '@/hooks/board/useBatchedSave';
import { formatDate, formatDateTime } from '@/lib/format';
import { AssigneeSelect } from './AssigneeSelect';
import { DueDatePicker } from './DueDatePicker';
import { LabelsInput } from './LabelsInput';
import { PriorityPicker } from './PriorityPicker';
import { StatusPicker } from './StatusPicker';

function Property({ label, htmlFor, children }) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-2 py-1">
      <label htmlFor={htmlFor} className="pt-1.5 text-[13px] text-fg-muted">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Meta({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-right text-fg-muted">{children}</dd>
    </div>
  );
}

/**
 * Task detail sidebar: status, priority, assignee, due date and labels, saved through
 * `onSave(data)` as soon as they change (quick successive label edits are batched into one
 * save), followed by creation / update metadata.
 */
export function TaskProperties({ task, members, membersLoading, currentUserId, readOnly, onSave }) {
  const ids = {
    status: `task-${task._id}-status`,
    priority: `task-${task._id}-priority`,
    assignee: `task-${task._id}-assignee`,
    due: `task-${task._id}-due`,
    labels: `task-${task._id}-labels`,
  };
  const saveBatched = useBatchedSave(onSave);

  return (
    <div className="rounded-xl border border-line bg-surface-muted/40 p-3 dark:bg-surface-muted/60">
      <h3 className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
        Details
      </h3>
      <div className="space-y-0.5">
        <Property label="Status" htmlFor={ids.status}>
          <StatusPicker
            id={ids.status}
            variant="ghost"
            value={task.status}
            disabled={readOnly}
            onChange={(status) => onSave({ status })}
          />
        </Property>
        <Property label="Priority" htmlFor={ids.priority}>
          <PriorityPicker
            id={ids.priority}
            variant="ghost"
            value={task.priority}
            disabled={readOnly}
            onChange={(priority) => onSave({ priority })}
          />
        </Property>
        <Property label="Assignee" htmlFor={ids.assignee}>
          <AssigneeSelect
            id={ids.assignee}
            variant="ghost"
            value={task.assignee?._id ?? ''}
            selectedUser={task.assignee}
            members={members}
            currentUserId={currentUserId}
            loading={membersLoading}
            disabled={readOnly}
            onChange={(assignee) => onSave({ assignee: assignee || null })}
          />
        </Property>
        <Property label="Due date" htmlFor={ids.due}>
          <DueDatePicker
            id={ids.due}
            variant="ghost"
            value={task.dueDate}
            status={task.status}
            disabled={readOnly}
            onChange={(dueDate) => onSave({ dueDate })}
          />
        </Property>
        <Property label="Labels" htmlFor={ids.labels}>
          <LabelsInput
            id={ids.labels}
            variant="ghost"
            value={task.labels ?? []}
            disabled={readOnly}
            onChange={(labels) => saveBatched({ labels })}
          />
        </Property>
      </div>

      <dl className="mt-3 space-y-2.5 border-t border-line px-1 pt-3.5 text-xs">
        <Meta label="Created by">
          <Avatar user={task.createdBy} size="xs" decorative />
          <span className="truncate font-medium text-fg">{task.createdBy?.name ?? 'Unknown'}</span>
        </Meta>
        <Meta label="Created">
          <span title={formatDateTime(task.createdAt)}>{formatDate(task.createdAt)}</span>
        </Meta>
        <Meta label="Updated">
          <TimeAgo date={task.updatedAt} />
        </Meta>
        {task.completedAt && (
          <Meta label="Completed">
            <span
              title={formatDateTime(task.completedAt)}
              className="font-medium text-emerald-600 dark:text-emerald-400"
            >
              {formatDate(task.completedAt)}
            </span>
          </Meta>
        )}
      </dl>
    </div>
  );
}
