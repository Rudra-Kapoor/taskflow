import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { StatusPicker } from '@/components/tasks/StatusPicker';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  LabelChip,
  PriorityBadge,
  Select,
  StatusBadge,
  TimeAgo,
} from '@/components/ui';
import { useUpdateTask } from '@/hooks/queries/tasks';
import { cn } from '@/lib/cn';
import { getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';
import { DueChip } from './DueChip';
import { DEFAULT_LIST_SORT, LIST_COLUMNS, sortTasks, toggleSort } from './listSort';

const MAX_LABELS = 3;
/** Fixed table layout: the title takes the remaining width; "Updated" only on very wide screens. */
const TABLE_COLUMNS = [
  { key: 'key', className: 'w-24 pl-5' },
  { key: 'title', className: '' },
  { key: 'status', className: 'w-36' },
  { key: 'priority', className: 'w-28' },
  { key: 'assignee', className: 'w-44' },
  { key: 'due', className: 'w-36' },
  { key: 'updated', className: 'hidden w-32 pr-5 2xl:table-cell' },
];

const stopPropagation = (event) => event.stopPropagation();

function SortHeader({ columnKey, sort, onSort, className }) {
  const active = sort.key === columnKey;
  const Icon = active ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  let ariaSort = 'none';
  if (active) ariaSort = sort.direction === 'asc' ? 'ascending' : 'descending';

  return (
    <th scope="col" aria-sort={ariaSort} className={cn('px-3 py-2.5 font-medium', className)}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          'focus-ring group/sort -mx-1 inline-flex items-center gap-1 rounded px-1 transition-colors hover:text-fg',
          active && 'text-fg',
        )}
      >
        {LIST_COLUMNS[columnKey].label}
        <Icon
          className={cn(
            'h-3.5 w-3.5 transition-opacity',
            active ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-60',
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

/** The task's labels on their own line under the title. */
function Labels({ labels }) {
  if (!labels?.length) return null;
  const hidden = labels.length - MAX_LABELS;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {labels.slice(0, MAX_LABELS).map((label) => (
        <LabelChip key={label} label={label} className="max-w-[9rem]" />
      ))}
      {hidden > 0 && (
        <span className="text-[11px] font-medium text-fg-muted" title={labels.join(', ')}>
          +{hidden}
          <span className="sr-only"> more labels</span>
        </span>
      )}
    </span>
  );
}

function AssigneeCell({ user }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar user={user} size="xs" decorative />
      <span className={cn('truncate', user ? 'text-fg' : 'text-fg-muted')}>
        {user ? user.name : 'Unassigned'}
      </span>
    </span>
  );
}

/**
 * Table view of the (filtered) tasks with client-side sortable columns and inline status
 * changes; stacked cards on small screens. Clicking a row (or its title link) opens the task.
 */
export function ListView({ tasks, readOnly, filtered, onClearFilters, onOpenTask }) {
  const location = useLocation();
  const [sort, setSort] = useState(DEFAULT_LIST_SORT);
  const { mutateAsync: updateTask } = useUpdateTask();
  const sorted = useMemo(() => sortTasks(tasks, sort), [tasks, sort]);
  const taskLink = (taskId) => withTaskParam(taskId, location);

  const changeStatus = (taskId, status) => {
    updateTask({ taskId, data: { status } }).catch((error) =>
      toast.error(getErrorMessage(error, 'Could not change the status')),
    );
  };

  if (tasks.length === 0) {
    return (
      <Card className="flex flex-1 items-center justify-center">
        {filtered ? (
          <EmptyState
            icon={SearchX}
            title="No tasks match your filters"
            description="Try a different search or clear the filters to see every task."
            action={
              <Button variant="secondary" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="No tasks yet"
            description="Tasks you create in this project will be listed here."
          />
        )}
      </Card>
    );
  }

  return (
    <>
      {/* Desktop: sortable table */}
      <Card padding={false} className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] table-fixed text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-left text-xs text-fg-muted">
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <SortHeader
                    key={column.key}
                    columnKey={column.key}
                    sort={sort}
                    onSort={(key) => setSort((current) => toggleSort(current, key))}
                    className={column.className}
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((task) => (
                <tr
                  key={task._id}
                  onClick={() => onOpenTask(task._id)}
                  className="group cursor-pointer transition-colors hover:bg-surface-hover/60"
                >
                  <td className="whitespace-nowrap py-3 pl-5 pr-3 align-top font-mono text-xs leading-5 text-fg-muted">
                    {getTaskKey(task)}
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <Link
                      to={taskLink(task._id)}
                      state={TASK_LINK_STATE}
                      onClick={stopPropagation}
                      className={cn(
                        'focus-ring inline-block max-w-full truncate rounded align-top font-medium leading-5 transition-colors',
                        'group-hover:text-brand-700 dark:group-hover:text-brand-300',
                        task.status === 'completed' ? 'text-fg-muted' : 'text-fg',
                      )}
                    >
                      {task.title}
                    </Link>
                    <Labels labels={task.labels} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-top" onClick={stopPropagation}>
                    <StatusPicker
                      variant="badge"
                      value={task.status}
                      disabled={readOnly}
                      onChange={(status) => changeStatus(task._id, status)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-top">
                    <PriorityBadge priority={task.priority} size="sm" />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <AssigneeCell user={task.assignee} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-top">
                    {task.dueDate ? (
                      <DueChip dueDate={task.dueDate} status={task.status} />
                    ) : (
                      <span className="text-fg-muted">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">No due date</span>
                      </span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap py-3 pl-3 pr-5 align-top text-xs leading-5 text-fg-muted 2xl:table-cell">
                    <TimeAgo date={task.updatedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile: stacked cards */}
      <div className="md:hidden">
        <div className="mb-3 flex items-center justify-end gap-2 text-xs text-fg-muted">
          <label htmlFor="list-sort">Sort by</label>
          <Select
            id="list-sort"
            value={sort.key}
            onChange={(event) =>
              setSort({
                key: event.target.value,
                direction: LIST_COLUMNS[event.target.value].direction,
              })
            }
            className="h-8 w-auto text-xs"
          >
            {TABLE_COLUMNS.map((column) => (
              <option key={column.key} value={column.key}>
                {LIST_COLUMNS[column.key].label}
              </option>
            ))}
          </Select>
        </div>
        <ul className="space-y-2">
          {sorted.map((task) => (
            <li key={task._id}>
              <Link
                to={taskLink(task._id)}
                state={TASK_LINK_STATE}
                className="card focus-ring block p-3.5 transition-colors hover:border-line-strong"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-medium text-fg-muted">
                    {getTaskKey(task)}
                  </span>
                  <PriorityBadge
                    priority={task.priority}
                    showLabel={false}
                    size="sm"
                    className="ml-auto"
                  />
                </span>
                <span
                  className={cn(
                    'mt-1 line-clamp-2 break-words text-sm font-medium leading-snug',
                    task.status === 'completed' ? 'text-fg-muted' : 'text-fg',
                  )}
                >
                  {task.title}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={task.status} size="sm" />
                  <DueChip dueDate={task.dueDate} status={task.status} />
                  <Avatar user={task.assignee} size="sm" className="ml-auto" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
