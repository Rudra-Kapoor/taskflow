import { sortByPosition } from '@/lib/cache';
import { TASK_STATUSES } from '@/lib/constants';

/** `{ todo: Task[], in_progress: Task[], completed: Task[] }`, keeping the incoming order. */
export function groupTasksByStatus(tasks) {
  const columns = Object.fromEntries(TASK_STATUSES.map((status) => [status.value, []]));
  for (const task of tasks) columns[task.status]?.push(task);
  return columns;
}

/**
 * Applies local drag & drop results (`taskId -> { status, position }`) that the query cache may
 * not reflect yet, so a dropped card never flashes back to its old column.
 */
export function applyPendingMoves(tasks, moves) {
  if (Object.keys(moves).length === 0) return tasks;
  let changed = false;
  const next = tasks.map((task) => {
    const move = moves[task._id];
    if (!move || (move.status === task.status && move.position === task.position)) return task;
    changed = true;
    return { ...task, status: move.status, position: move.position };
  });
  return changed ? sortByPosition(next) : tasks;
}

/**
 * The `/move` neighbours of a card dropped at `index` of a column as it was displayed when the
 * drag started (`displayedColumn`, without the dragged card). Teammates may have moved or deleted
 * tasks meanwhile, so only tasks still in the live target column (`liveColumn`, sorted, without
 * the dragged card) qualify: the nearest one shown above the drop point becomes `prevTaskId`, the
 * nearest one below `nextTaskId`. If they swapped places in the meantime "after prev" wins, like
 * on the server.
 */
export function findDropNeighbours(displayedColumn, index, liveColumn) {
  const order = new Map(liveColumn.map((task, position) => [task._id, position]));
  const isLive = (task) => order.has(task._id);
  const prev = displayedColumn.slice(0, index).reverse().find(isLive);
  let next = displayedColumn.slice(index).find(isLive);
  if (prev && next && order.get(next._id) < order.get(prev._id)) next = undefined;
  return { prevTaskId: prev?._id, nextTaskId: next?._id };
}
