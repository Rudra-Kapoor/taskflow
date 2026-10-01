import { api, path, unwrap, unwrapMessage } from './client';

/** Comments of a task, oldest first. */
export async function getComments(taskId, { signal } = {}) {
  return unwrap(await api.get(path`/tasks/${taskId}/comments`, { signal }));
}

export async function addComment(taskId, body) {
  return unwrap(await api.post(path`/tasks/${taskId}/comments`, { body }));
}

export async function updateComment(commentId, body) {
  return unwrap(await api.patch(path`/comments/${commentId}`, { body }));
}

export async function deleteComment(commentId) {
  return unwrapMessage(await api.delete(path`/comments/${commentId}`));
}
