import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compactParams } from '@/api/client';
import { getProjectTasks } from '@/api/projects';
import { createTask, deleteTask, getTask, moveTask, searchTasks, updateTask } from '@/api/tasks';
import {
  computeLocalPosition,
  findCachedTask,
  invalidateTaskAggregates,
  patchTaskPositions,
  removeTaskFromCaches,
  removeTaskFromLists,
  sortByPosition,
  upsertTaskInCaches,
} from '@/lib/cache';
import { getId } from '@/lib/ids';
import {
  applyOptimisticPatch,
  completedAtFor,
  pickOptimisticFields,
  rebaseOnPendingEdits,
} from '@/lib/optimisticTasks';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';

/**
 * Cancels in-flight fetches of already-loaded queries so they cannot land on top of an
 * optimistic update. Returns the keys whose refresh was interrupted, to re-run once settled.
 */
async function pauseRefetches(queryClient, keys) {
  const interrupted = keys.filter((queryKey) => {
    const state = queryClient.getQueryState(queryKey);
    return state?.data !== undefined && state.fetchStatus === 'fetching';
  });
  await Promise.all(
    interrupted.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })),
  );
  return interrupted;
}

function resumeRefetches(queryClient, keys) {
  keys?.forEach((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true }));
}

/**
 * Restores the pre-mutation copy of a task - ignored automatically if fresher server data
 * arrived meanwhile - and refetches its board and detail to reconcile with the server.
 */
function rollbackTask(queryClient, previous) {
  if (!previous) return;
  upsertTaskInCaches(queryClient, previous);
  const boardKey = queryKeys.tasks.board(getId(previous.project));
  queryClient.invalidateQueries({ queryKey: boardKey, exact: true });
  queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(previous._id), exact: true });
}

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------

/** Every task of a project (the board), sorted by ascending position. */
export function useProjectTasks(projectId) {
  return useQuery({
    queryKey: queryKeys.tasks.board(projectId),
    queryFn: async ({ signal }) => sortByPosition(await getProjectTasks(projectId, { signal })),
    enabled: Boolean(projectId),
  });
}

/** One task. Renders at once from any cached copy (board, search, dashboard) while it loads. */
export function useTask(taskId) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: ({ signal }) => getTask(taskId, { signal }),
    enabled: Boolean(taskId),
    placeholderData: () => findCachedTask(queryClient, taskId),
  });
}

/** Cross-project search `{ items, meta }`; keeps the previous page while the next one loads. */
export function useSearchTasks(params) {
  const filters = compactParams(params);
  return useQuery({
    queryKey: queryKeys.tasks.search(filters),
    queryFn: ({ signal }) => searchTasks(filters, { signal }),
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------------------------
// Mutations (no toasts: callers decide; errors are rethrown)
// ---------------------------------------------------------------------------------------------

/** vars `{ projectId, data }` -> the created task. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.tasks.create,
    mutationFn: ({ projectId, data }) => createTask(projectId, data),
    onSuccess: (task) => {
      upsertTaskInCaches(queryClient, task);
      invalidateTaskAggregates(queryClient, { counts: true });
    },
  });
}

/**
 * vars `{ taskId, data }` -> the updated task. Scalar fields apply optimistically (a status
 * change also moves the task to the end of its new column); `assignee` waits for the server.
 * Rolled back on error.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.tasks.update,
    mutationFn: ({ taskId, data }) => updateTask(taskId, data),
    onMutate: async ({ taskId, data }) => {
      const cached = findCachedTask(queryClient, taskId);
      const patch = pickOptimisticFields(data);
      if (!cached || !patch) return { previous: cached };

      const interrupted = await pauseRefetches(queryClient, [
        queryKeys.tasks.board(getId(cached.project)),
        queryKeys.tasks.detail(taskId),
      ]);
      const previous = findCachedTask(queryClient, taskId) ?? cached;
      upsertTaskInCaches(queryClient, applyOptimisticPatch(queryClient, previous, patch));
      return { previous, interrupted };
    },
    onError: (_error, _variables, context) => rollbackTask(queryClient, context?.previous),
    onSuccess: (task, variables, context) => {
      // Later edits of the same task may still be in flight: keep them on top of this response.
      upsertTaskInCaches(queryClient, rebaseOnPendingEdits(queryClient, task, { skip: variables }));
      invalidateTaskAggregates(queryClient, { counts: context?.previous?.status !== task.status });
    },
    onSettled: (_data, _error, _variables, context) => {
      resumeRefetches(queryClient, context?.interrupted);
    },
  });
}

/**
 * Drag & drop. vars `{ taskId, status, prevTaskId, nextTaskId }` (neighbours as displayed).
 * Optimistic: the task takes its new status and the position the server will compute; rolled
 * back on error. The server's task and any re-balanced positions are applied on success.
 */
export function useMoveTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.tasks.move,
    mutationFn: ({ taskId, status, prevTaskId, nextTaskId }) =>
      moveTask(taskId, { status, prevTaskId, nextTaskId }),
    onMutate: async ({ taskId, status, prevTaskId, nextTaskId }) => {
      const boardKey = queryKeys.tasks.board(projectId);
      const interrupted = await pauseRefetches(queryClient, [boardKey]);
      const tasks = queryClient.getQueryData(boardKey);
      const previous = tasks?.find((task) => task._id === taskId);
      if (!previous) return { interrupted };

      const column = tasks.filter((task) => task.status === status && task._id !== taskId);
      upsertTaskInCaches(queryClient, {
        ...previous,
        status,
        position: computeLocalPosition(column, prevTaskId, nextTaskId),
        completedAt: completedAtFor(previous, status),
      });
      return { previous, interrupted };
    },
    onError: (_error, _variables, context) => rollbackTask(queryClient, context?.previous),
    onSuccess: ({ task, reordered }, _variables, context) => {
      upsertTaskInCaches(queryClient, rebaseOnPendingEdits(queryClient, task));
      patchTaskPositions(queryClient, projectId, reordered);
      // Re-ordering inside a column changes no counts; a status change does.
      if (context?.previous?.status !== task?.status) {
        invalidateTaskAggregates(queryClient, { counts: true });
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      resumeRefetches(queryClient, context?.interrupted);
    },
  });
}

/** vars `{ taskId, projectId }`. Optimistically removed from board and lists; restored on error. */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.tasks.delete,
    mutationFn: ({ taskId }) => deleteTask(taskId),
    onMutate: async ({ taskId, projectId }) => {
      const previous = findCachedTask(queryClient, taskId);
      const boardProjectId = projectId ?? getId(previous?.project);
      const interrupted = await pauseRefetches(queryClient, [
        queryKeys.tasks.board(boardProjectId),
      ]);
      // The detail stays cached until success so an open task view doesn't flash empty.
      removeTaskFromLists(queryClient, taskId, boardProjectId);
      return { previous, projectId: boardProjectId, interrupted };
    },
    onError: (_error, _variables, context) => {
      rollbackTask(queryClient, context?.previous); // re-inserts it into its board
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.searches() });
    },
    onSuccess: (_data, { taskId }, context) => {
      removeTaskFromCaches(queryClient, taskId, context?.projectId);
      invalidateTaskAggregates(queryClient, { counts: true });
    },
    onSettled: (_data, _error, _variables, context) => {
      resumeRefetches(queryClient, context?.interrupted);
    },
  });
}
