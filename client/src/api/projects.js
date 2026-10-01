import { api, compactParams, path, unwrap, unwrapMessage, unwrapPage } from './client';

/** Projects the user can access. `params`: `{ search?, team?, status? = active | archived | all }`. */
export async function getProjects(params = {}, { signal } = {}) {
  return unwrap(await api.get('/projects', { params: compactParams(params), signal }));
}

/** A project with its full team (members = assignable users). */
export async function getProject(id, { signal } = {}) {
  return unwrap(await api.get(path`/projects/${id}`, { signal }));
}

export async function createProject(data) {
  return unwrap(await api.post('/projects', data));
}

export async function updateProject(id, data) {
  return unwrap(await api.patch(path`/projects/${id}`, data));
}

export async function deleteProject(id) {
  return unwrapMessage(await api.delete(path`/projects/${id}`));
}

/** Every task of the project (the board). */
export async function getProjectTasks(id, { signal } = {}) {
  return unwrap(await api.get(path`/projects/${id}/tasks`, { signal }));
}

/** Cursor-paginated activity: `{ items, meta: { nextCursor, hasMore } }`. */
export async function getProjectActivity(id, { before, limit } = {}, { signal } = {}) {
  const params = compactParams({ before, limit });
  return unwrapPage(await api.get(path`/projects/${id}/activity`, { params, signal }));
}
