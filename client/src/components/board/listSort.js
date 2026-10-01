import { PRIORITY_ORDER, TASK_STATUSES } from '@/lib/constants';

const STATUS_ORDER = Object.fromEntries(TASK_STATUSES.map((status, index) => [status.value, index]));

const toTime = (iso) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? null : time;
};

/**
 * Sortable list columns: `values(task)` returns the comparison keys (compared in order) and
 * `direction` is the first-click direction. Empty values (`null`) always sort last.
 */
export const LIST_COLUMNS = {
  key: { label: 'Key', direction: 'asc', values: (task) => [task.number] },
  title: { label: 'Title', direction: 'asc', values: (task) => [task.title.toLowerCase()] },
  status: {
    label: 'Status',
    direction: 'asc',
    values: (task) => [STATUS_ORDER[task.status], task.position],
  },
  priority: {
    label: 'Priority',
    direction: 'asc',
    values: (task) => [PRIORITY_ORDER[task.priority]],
  },
  assignee: {
    label: 'Assignee',
    direction: 'asc',
    values: (task) => [task.assignee?.name?.toLowerCase() ?? null],
  },
  due: { label: 'Due date', direction: 'asc', values: (task) => [toTime(task.dueDate)] },
  updated: { label: 'Updated', direction: 'desc', values: (task) => [toTime(task.updatedAt)] },
};

export const DEFAULT_LIST_SORT = { key: 'status', direction: 'asc' };

function compareKeys(a, b, factor) {
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === right) continue;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    const result = typeof left === 'string' ? left.localeCompare(right) : left - right;
    if (result !== 0) return result * factor;
  }
  return 0;
}

/** A sorted copy of `tasks` for `{ key, direction }` (ties keep task-number order). */
export function sortTasks(tasks, { key, direction }) {
  const column = LIST_COLUMNS[key] ?? LIST_COLUMNS[DEFAULT_LIST_SORT.key];
  const factor = direction === 'desc' ? -1 : 1;
  return tasks
    .map((task) => ({ task, keys: column.values(task) }))
    .sort((a, b) => compareKeys(a.keys, b.keys, factor) || a.task.number - b.task.number)
    .map(({ task }) => task);
}

/** Next sort state after clicking the header of `key`. */
export function toggleSort(current, key) {
  if (current.key !== key) return { key, direction: LIST_COLUMNS[key].direction };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}
