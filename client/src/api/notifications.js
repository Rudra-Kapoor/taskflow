import { api, compactParams, path, unwrap, unwrapMessage, unwrapPage } from './client';

/**
 * The current user's notifications, newest first.
 * @returns {Promise<{ items: object[], meta: { page, limit, total, totalPages, unreadCount } }>}
 */
export async function getNotifications({ unread, page, limit } = {}, { signal } = {}) {
  // Only send `unread` when filtering: the API reads any value as a filter.
  const params = compactParams({ unread: unread ? 'true' : undefined, page, limit });
  return unwrapPage(await api.get('/notifications', { params, signal }));
}

export async function markNotificationRead(id) {
  return unwrap(await api.patch(path`/notifications/${id}/read`));
}

/** @returns {Promise<{ updated: number }>} */
export async function markAllNotificationsRead() {
  return unwrap(await api.patch('/notifications/read-all'));
}

export async function deleteNotification(id) {
  return unwrapMessage(await api.delete(path`/notifications/${id}`));
}
