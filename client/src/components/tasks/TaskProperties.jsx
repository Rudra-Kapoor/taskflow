import { Avatar, TimeAgo } from '@/components/ui';
import { useBatchedSave } from '@/hooks/board/useBatchedSave';
import { formatDate, formatDateTime } from '@/lib/format';
import { AssigneeSelect } from './AssigneeSelect';
import { DueDatePicker } from './DueDatePicker';
import { LabelsInput } from './LabelsInput';
import { PriorityPicker } from './PriorityPicker';
import { StatusPicker } from './StatusPicker';

const LABEL_CLASSES = 'font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-fg-muted';

function Property({ label, htmlFor, children }) {
  return (
    <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-start gap-2 py-2">
      <label htmlFor={htmlFor} className={`${LABEL_CLASSES} pt-2`}>
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Meta({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-right text-fg">{children}</dd>
    </div>
  );
}

/**
 * Task detail properties: status, priority, assignee, due date and labels as a label / value grid
 * on hairline rules, saved through `onSave(data)` as soon as they change (quick successive label
 * edits are batched into one save), followed by creation / update metadata.
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
    <div>
      <h3 className={`${LABEL_CLASSES} pb-2`}>Details</h3>
      <div className="divide-y divide-line border-y border-line">
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

      <dl className="mt-5 space-y-2.5 text-xs">
        <Meta label="Created by">
          <Avatar user={task.createdBy} size="xs" decorative />
          <span className="truncate">{task.createdBy?.name ?? 'Unknown'}</span>
        </Meta>
        <Meta label="Created">
          <span title={formatDateTime(task.createdAt)} className="font-mono text-[11px] tabular-nums">
            {formatDate(task.createdAt)}
          </span>
        </Meta>
        <Meta label="Updated">
          <TimeAgo date={task.updatedAt} className="text-fg-muted" />
        </Meta>
        {task.completedAt && (
          <Meta label="Completed">
            <span
              title={formatDateTime(task.completedAt)}
              className="font-mono text-[11px] tabular-nums text-emerald-700 dark:text-emerald-400"
            >
              {formatDate(task.completedAt)}
            </span>
          </Meta>
        )}
      </dl>
    </div>
  );
}
