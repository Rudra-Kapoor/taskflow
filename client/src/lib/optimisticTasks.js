import { computeLocalPosition } from '@/lib/cache';
import { getId } from '@/lib/ids';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';

/** Fields `useUpdateTask` applies optimistically (`assignee` waits for the populated user). */
const OPTIMISTIC_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate', 'labels'];

export const completedAtFor = (task, status) => {
  if (status !== 'completed') return null;
  return task.status === 'completed' ? task.completedAt : new Date().toISOString();
};

/** Mirrors the server's label normalisation (trimmed, lower-cased, de-duplicated). */
const normalizeLabels = (labels) => [
  ...new Set(labels.map((label) => String(label).trim().toLowerCase()).filter(Boolean)),
];

export function pickOptimisticFields(data = {}) {
  const fields = OPTIMISTIC_FIELDS.filter((field) => data[field] !== undefined);
  return fields.length ? Object.fromEntries(fields.map((field) => [field, data[field]])) : null;
}

/** The task as the server will return it after `patch` (same `updatedAt`: still a local copy). */
export function applyOptimisticPatch(queryClient, task, patch) {
  const next = { ...task, ...patch };
  if (typeof patch.title === 'string') next.title = patch.title.trim();
  if (typeof patch.description === 'string') next.description = patch.description.trim();
  if (Array.isArray(patch.labels)) next.labels = normalizeLabels(patch.labels);
  if (patch.status && patch.status !== task.status) {
    // A status change through PATCH appends the task to its new column (server rule).
    const board = queryClient.getQueryData(queryKeys.tasks.board(getId(task.project)));
    if (board) {
      const column = board.filter((item) => item.status === patch.status && item._id !== task._id);
      next.position = computeLocalPosition(column);
    }
    next.completedAt = completedAtFor(task, patch.status);
  }
  return next;
}

/**
 * Re-applies this client's still-pending edits of a task on top of a fresh server copy (an
 * HTTP response or a socket echo). Without it, the response to an earlier edit would briefly
 * revert a newer optimistic edit until that edit's own response arrives. `skip` excludes the
 * mutation (by its variables) whose response is being applied.
 */
export function rebaseOnPendingEdits(queryClient, serverTask, { skip } = {}) {
  if (!serverTask?._id) return serverTask;
  return queryClient
    .getMutationCache()
    .findAll({ mutationKey: mutationKeys.tasks.update, status: 'pending' })
    .filter(({ state }) => state.variables !== skip && state.variables?.taskId === serverTask._id)
    .sort((a, b) => a.state.submittedAt - b.state.submittedAt)
    .reduce((task, { state }) => {
      const patch = pickOptimisticFields(state.variables.data);
      return patch ? applyOptimisticPatch(queryClient, task, patch) : task;
    }, serverTask);
}
