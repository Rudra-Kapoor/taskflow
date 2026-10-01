import { getId } from '@/lib/ids';

/**
 * Every page can show a task in the global task modal: AppLayout renders it whenever the URL has
 * `?task=<id>`. These helpers are the single place that builds and clears that URL.
 */
export const TASK_PARAM = 'task';

/** History state of entries pushed by "open task", so closing can simply go back to the page. */
export const TASK_LINK_STATE = Object.freeze({ taskOpenedInApp: true });

/** True when the current history entry was pushed by opening a task in-app (not a deep link). */
const isOpenedInApp = () => Boolean(window.history.state?.usr?.taskOpenedInApp);

/** Deep link to a task on its project board, e.g. for notifications and toasts. */
export const taskBoardPath = (projectId, taskId) =>
  `/projects/${getId(projectId)}?${TASK_PARAM}=${encodeURIComponent(getId(taskId))}`;

/**
 * The current page (pathname + its other search params) with the task modal opened for
 * `taskId`, or closed when `taskId` is null. Pass a router `location` when rendering links;
 * by default the live `window.location` is used, so rapid updates never start from a stale URL.
 */
export function withTaskParam(taskId, location = window.location) {
  const params = new URLSearchParams(location.search);
  if (taskId) params.set(TASK_PARAM, taskId);
  else params.delete(TASK_PARAM);
  const search = params.toString();
  return { pathname: location.pathname, search: search ? `?${search}` : '' };
}

/** Opens a task over the current page. Pushes a history entry, so Back closes the modal. */
export function openTaskModal(navigate, taskId) {
  navigate(withTaskParam(taskId), { state: TASK_LINK_STATE });
}

/**
 * Closes the task modal. When the task was opened in-app this goes back to the entry it was
 * opened from (no duplicate history entries); for deep links and reloads it removes the param.
 */
export function closeTaskModal(navigate) {
  if (isOpenedInApp()) navigate(-1);
  else navigate(withTaskParam(null), { replace: true });
}
