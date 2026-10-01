import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMessage, sendSuccess } from '../utils/response.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const { items, meta } = await notificationService.listNotifications(req.user, req.query);
  sendSuccess(res, items, { meta });
});

export const markAllRead = asyncHandler(async (req, res) => {
  sendSuccess(res, await notificationService.markAllNotificationsRead(req.user));
});

export const markRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  sendSuccess(res, await notificationService.markNotificationRead(req.user, notificationId));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user, req.params.notificationId);
  sendMessage(res, 'Notification deleted');
});
