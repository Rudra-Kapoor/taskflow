import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { closeTaskModal, openTaskModal } from '@/lib/taskLinks';

/**
 * `{ openTask(taskId), closeTask() }` for the global task modal (see lib/taskLinks.js).
 * Both callbacks keep their identity while the pathname stays the same, so memoised board
 * cards don't re-render on every search-param change.
 */
export function useTaskModal() {
  const navigate = useNavigate();
  const openTask = useCallback((taskId) => openTaskModal(navigate, taskId), [navigate]);
  const closeTask = useCallback(() => closeTaskModal(navigate), [navigate]);
  return useMemo(() => ({ openTask, closeTask }), [openTask, closeTask]);
}
