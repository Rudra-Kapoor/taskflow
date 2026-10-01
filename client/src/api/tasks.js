import { api, compactParams, getTzOffset, path, unwrap, unwrapMessage, unwrapPage } from './client';

/**
 * Searches tasks across every accessible project (`search`, `project`, `status`, `priority`,
 * `assignee`, `due`, `sort`, `page`, `limit`). Sends `tzOffset` so `due` filters use local days.
 * @returns {Promise<{ items: object[], meta: { page, limit, total, totalPages } }>}
 */
export async function searchTasks(params = {}, { signal } = {}) {
  const query = compactParams({ ...params, tzOffset: getTzOffset() });
  return unwrapPage(await api.get('/tasks', { params: query, signal }));
}

export async function getTask(id, { signal } = {}) {
  return unwrap(await api.get(path`/tasks/${id}`, { signal }));
}

export async function createTask(projectId, data) {
  return unwrap(await api.post(path`/projects/${projectId}/tasks`, data));
}

export async function updateTask(id, data) {
  return unwrap(await api.patch(path`/tasks/${id}`, data));
}

/**
 * Drag & drop: places the task between the given neighbours (as displayed) in `status`.
 * @returns {Promise<{ task: object, reordered: { _id: string, position: number }[] }>}
 */
export async function moveTask(id, { status, prevTaskId, nextTaskId }) {
  const body = { status, prevTaskId: prevTaskId || undefined, nextTaskId: nextTaskId || undefined };
  return unwrap(await api.patch(path`/tasks/${id}/move`, body));
}

export async function deleteTask(id) {
  return unwrapMessage(await api.delete(path`/tasks/${id}`));
}

/** Cursor-paginated activity: `{ items, meta: { nextCursor, hasMore } }`. */
export async function getTaskActivity(id, { before, limit } = {}, { signal } = {}) {
  const params = compactParams({ before, limit });
  return unwrapPage(await api.get(path`/tasks/${id}/activity`, { params, signal }));
}
