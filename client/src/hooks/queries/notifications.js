import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compactParams } from '@/api/client';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';
import {
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
  removeNotificationFromCache,
} from '@/lib/cache';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';

/** The small list shared by the notification bell and every unread badge (one request). */
export const NOTIFICATION_PREVIEW_PARAMS = { limit: 8 };

function notificationsQueryOptions({ unread, page = 1, limit = 20 } = {}) {
  const params = compactParams({ unread: unread ? true : undefined, page, limit });
  return {
    queryKey: queryKeys.notifications.list(params),
    queryFn: ({ signal }) => getNotifications(params, { signal }),
    placeholderData: keepPreviousData,
  };
}

/** A page of notifications: `{ items, meta: { page, limit, total, totalPages, unreadCount } }`. */
export function useNotifications(params) {
  return useQuery(notificationsQueryOptions(params));
}

const selectUnreadCount = (data) => data?.meta?.unreadCount ?? 0;

/** Number of unread notifications (shares the `useNotifications({ limit: 8 })` request). */
export function useUnreadCount() {
  const { data } = useQuery({
    ...notificationsQueryOptions(NOTIFICATION_PREVIEW_PARAMS),
    select: selectUnreadCount,
  });
  return data ?? 0;
}

/** Stops loaded lists from refetching mid-update and snapshots them for a rollback. */
async function snapshotNotificationLists(queryClient) {
  await queryClient.cancelQueries({
    queryKey: queryKeys.notifications.all,
    predicate: (query) => query.state.data !== undefined,
  });
  return queryClient.getQueriesData({ queryKey: queryKeys.notifications.all });
}

function restoreSnapshot(queryClient, snapshot) {
  snapshot?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
}

/** Refetches the lists once the last of several concurrent notification mutations settles. */
function settleNotificationLists(queryClient) {
  if (queryClient.isMutating({ mutationKey: mutationKeys.notifications.all }) <= 1) {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }
}

/** Mutation options shared by `useMarkNotificationRead` and the real-time notification toast. */
export function markNotificationReadOptions(queryClient) {
  return {
    mutationKey: mutationKeys.notifications.markRead,
    mutationFn: (notificationId) => markNotificationRead(notificationId),
    onMutate: async (notificationId) => {
      const snapshot = await snapshotNotificationLists(queryClient);
      markNotificationReadInCache(queryClient, notificationId);
      return { snapshot };
    },
    onError: (_error, _notificationId, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSettled: () => settleNotificationLists(queryClient),
  };
}

/** vars `notificationId`; optimistic across every cached list (and the unread count). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation(markNotificationReadOptions(queryClient));
}

/** Optimistic: every cached list is marked read and the unread count drops to 0. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.notifications.markAllRead,
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      const snapshot = await snapshotNotificationLists(queryClient);
      markAllNotificationsReadInCache(queryClient);
      return { snapshot };
    },
    onError: (_error, _variables, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSettled: () => settleNotificationLists(queryClient),
  });
}

/** vars `notificationId`; optimistically removed from every cached list. */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.notifications.delete,
    mutationFn: (notificationId) => deleteNotification(notificationId),
    onMutate: async (notificationId) => {
      const snapshot = await snapshotNotificationLists(queryClient);
      removeNotificationFromCache(queryClient, notificationId);
      return { snapshot };
    },
    onError: (_error, _notificationId, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSettled: () => settleNotificationLists(queryClient),
  });
}
