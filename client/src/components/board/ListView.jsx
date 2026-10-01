import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { StatusPicker } from '@/components/tasks/StatusPicker';
import { PriorityGlyph, StatusLabel } from '@/components/tasks/TaskGlyphs';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  LabelChip,
  Select,
  TimeAgo,
} from '@/components/ui';
import { useUpdateTask } from '@/hooks/queries/tasks';
import { cn } from '@/lib/cn';
import { PRIORITY_META } from '@/lib/constants';
import { getTaskKey } from '@/lib/format';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';
import { DueChip } from './DueChip';
import { DEFAULT_LIST_SORT, LIST_COLUMNS, sortTasks, toggleSort } from './listSort';

const MAX_LABELS = 2;
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
    <th scope="col" aria-sort={ariaSort} className={cn('h-10 px-3 font-normal', className)}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          'focus-ring group/sort -mx-1 inline-flex items-center gap-1 rounded px-1 uppercase tracking-[0.08em] transition-colors hover:text-fg',
          active && 'text-fg',
        )}
      >
        {LIST_COLUMNS[columnKey].label}
        <Icon
          className={cn(
            'h-3 w-3 transition-opacity',
            active ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-60',
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

/** Up to two outlined labels after the title, "+n" for the rest. */
function Labels({ labels }) {
  if (!labels?.length) return null;
  const hidden = labels.length - MAX_LABELS;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {labels.slice(0, MAX_LABELS).map((label) => (
        <LabelChip key={label} label={label} className="max-w-[7rem]" />
      ))}
      {hidden > 0 && (
        <span className="font-mono text-[11px] text-fg-muted" title={labels.join(', ')}>
          +{hidden}
          <span className="sr-only"> more labels</span>
        </span>
      )}
    </span>
  );
}

function PriorityCell({ priority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;
  return (
    <span className="flex items-center gap-2 text-[13px] text-fg-muted">
      <PriorityGlyph priority={priority} />
      {meta.label}
    </span>
  );
}

function AssigneeCell({ user }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[13px]">
      <Avatar user={user} size="xs" decorative />
      <span className={cn('truncate', user ? 'text-fg' : 'text-fg-muted')}>
        {user ? user.name : 'Unassigned'}
      </span>
    </span>
  );
}

/**
 * Table view of the (filtered) tasks with client-side sortable columns and inline status
 * changes; a hairline list on small screens. Clicking a row (or its title link) opens the task.
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
      <Card className="flex flex-1 items-center justify-center shadow-none">
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
      <Card padding={false} className="hidden overflow-hidden shadow-none md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] table-fixed text-sm">
            <thead className="border-b border-line text-left font-mono text-[11px] text-fg-muted">
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
              {sorted.map((task) => {
                const done = task.status === 'completed';
                return (
                  <tr
                    key={task._id}
                    onClick={() => onOpenTask(task._id)}
                    className="group h-12 cursor-pointer transition-colors hover:bg-surface-muted/60 dark:hover:bg-surface-hover/50"
                  >
                    <td className="whitespace-nowrap py-2 pl-5 pr-3 font-mono text-xs tabular-nums text-fg-muted">
                      {getTaskKey(task)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Link
                          to={taskLink(task._id)}
                          state={TASK_LINK_STATE}
                          onClick={stopPropagation}
                          className={cn(
                            'focus-ring min-w-0 truncate rounded-sm font-medium leading-5 underline-offset-[3px]',
                            'decoration-line-strong group-hover:underline',
                            done ? 'text-fg-muted' : 'text-fg',
                          )}
                        >
                          {task.title}
                        </Link>
                        <Labels labels={task.labels} />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2" onClick={stopPropagation}>
                      <StatusPicker
                        variant="badge"
                        value={task.status}
                        disabled={readOnly}
                        onChange={(status) => changeStatus(task._id, status)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <PriorityCell priority={task.priority} />
                    </td>
                    <td className="px-3 py-2">
                      <AssigneeCell user={task.assignee} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {task.dueDate ? (
                        <DueChip dueDate={task.dueDate} status={task.status} />
                      ) : (
                        <span className="font-mono text-xs text-fg-subtle">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">No due date</span>
                        </span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap py-2 pl-3 pr-5 text-xs text-fg-muted 2xl:table-cell">
                      <TimeAgo date={task.updatedAt} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile: one hairline list */}
      <div className="md:hidden">
        <div className="mb-3 flex items-center justify-end gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
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
            className="w-auto border-line font-sans text-[13px] normal-case tracking-normal shadow-none"
          >
            {TABLE_COLUMNS.map((column) => (
              <option key={column.key} value={column.key}>
                {LIST_COLUMNS[column.key].label}
              </option>
            ))}
          </Select>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {sorted.map((task) => (
            <li key={task._id}>
              <Link
                to={taskLink(task._id)}
                state={TASK_LINK_STATE}
                className="focus-ring block px-4 py-3.5 transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 active:bg-surface-muted"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-fg-muted">
                    {getTaskKey(task)}
                  </span>
                  <PriorityGlyph priority={task.priority} labelled className="ml-auto" />
                </span>
                <span
                  className={cn(
                    'mt-1 line-clamp-2 break-words text-sm font-medium leading-snug',
                    task.status === 'completed' ? 'text-fg-muted' : 'text-fg',
                  )}
                >
                  {task.title}
                </span>
                <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <StatusLabel status={task.status} className="text-xs text-fg-muted" />
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
