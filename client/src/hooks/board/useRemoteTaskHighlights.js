import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/context/SocketContext';
import { getId } from '@/lib/ids';
import { mutationKeys } from '@/lib/queryKeys';

const HIGHLIGHT_MS = 2200;
const TASK_MUTATIONS = [
  mutationKeys.tasks.create,
  mutationKeys.tasks.update,
  mutationKeys.tasks.move,
];

/** The task a settled task mutation returned (`/move` responds with `{ task, reordered }`). */
const savedTask = (data) => data?.task ?? data;

/**
 * True when a socket event is the echo of one of this client's own task mutations. The event can
 * arrive before the HTTP response, so a pending mutation of the task (or a pending create in its
 * project) counts; a settled one only matches the exact version it produced (same `updatedAt`).
 * A teammate's change right after our own edit is therefore still highlighted.
 */
function isOwnTaskEcho(queryClient, task) {
  const projectId = getId(task.project);
  const mutations = queryClient.getMutationCache();
  return TASK_MUTATIONS.some((mutationKey) =>
    mutations.findAll({ mutationKey, exact: true }).some(({ state }) => {
      if (state.status === 'pending') {
        return mutationKey === mutationKeys.tasks.create
          ? state.variables?.projectId === projectId
          : state.variables?.taskId === task._id;
      }
      const saved = state.status === 'success' ? savedTask(state.data) : null;
      return saved?._id === task._id && saved.updatedAt === task.updatedAt;
    }),
  );
}

/**
 * Ids of the project's tasks that someone else just created or changed, for a brief highlight
 * on the board. Listens to the same project-room events the cache handlers use.
 */
export function useRemoteTaskHighlights(projectId) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (!socket || !projectId) return undefined;
    const timers = new Map();

    const unhighlight = (taskId) => {
      timers.delete(taskId);
      setIds((current) => {
        if (!current.has(taskId)) return current;
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    };

    const handleTask = (task) => {
      if (!task?._id || getId(task.project) !== projectId) return;
      if (isOwnTaskEcho(queryClient, task)) return;
      window.clearTimeout(timers.get(task._id));
      timers.set(
        task._id,
        window.setTimeout(() => unhighlight(task._id), HIGHLIGHT_MS),
      );
      setIds((current) => (current.has(task._id) ? current : new Set(current).add(task._id)));
    };

    socket.on('task:created', handleTask);
    socket.on('task:updated', handleTask);
    return () => {
      socket.off('task:created', handleTask);
      socket.off('task:updated', handleTask);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [socket, projectId, queryClient]);

  return ids;
}
