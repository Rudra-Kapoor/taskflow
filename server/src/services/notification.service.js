import { Notification } from '../models/index.js';
import { emitToUser } from '../socket/emitter.js';
import { SERVER_EVENTS } from '../socket/events.js';
import { ApiError } from '../utils/ApiError.js';
import { TASK_STATUS_LABELS, USER_PUBLIC_FIELDS } from '../utils/constants.js';
import { formatTaskKey, truncate } from '../utils/format.js';
import { logger } from '../utils/logger.js';
import { paginate, toId } from '../utils/query.js';

const MAX_MESSAGE_LENGTH = 300;

const NOTIFICATION_POPULATE = [
  { path: 'actor', select: USER_PUBLIC_FIELDS },
  { path: 'project', select: 'name key color' },
];

/** `WEB-12: Implement login page` */
export const taskRef = (task, project) =>
  `${formatTaskKey(project.key, task.number)}: ${task.title}`;

export const notificationMessages = Object.freeze({
  taskAssigned: (actorName, ref) => `${actorName} assigned you ${ref}`,
  taskStatusChanged: (actorName, ref, status) =>
    `${actorName} moved ${ref} to ${TASK_STATUS_LABELS[status]}`,
  taskCommented: (actorName, ref) => `${actorName} commented on ${ref}`,
  taskDueSoon: (ref) => `${ref} is due within 24 hours`,
  teamMemberAdded: (actorName, teamName) => `${actorName} added you to the team ${teamName}`,
});

/**
 * Creates one notification per recipient and pushes each to its owner in real time.
 * Recipients are de-duplicated, and the actor never notifies themselves. Like activity logging
 * this is a side effect, so it never throws.
 */
export async function createNotifications({
  recipients,
  actor = null,
  type,
  message,
  team = null,
  project = null,
  task = null,
}) {
  try {
    const actorId = toId(actor);
    const recipientIds = [...new Set(recipients.map(toId).filter(Boolean))].filter(
      (recipientId) => recipientId !== actorId,
    );
    if (!recipientIds.length) return [];

    const docs = await Notification.insertMany(
      recipientIds.map((recipient) => ({
        recipient,
        actor: actorId,
        type,
        message: truncate(message, MAX_MESSAGE_LENGTH),
        team: toId(team),
        project: toId(project),
        task: toId(task),
      })),
    );
    const notifications = await Notification.populate(docs, NOTIFICATION_POPULATE);
    for (const notification of notifications) {
      emitToUser(notification.recipient, SERVER_EVENTS.NOTIFICATION_CREATED, notification);
    }
    return notifications;
  } catch (error) {
    logger.error(`Failed to create "${type}" notifications`, error);
    return [];
  }
}

export async function listNotifications(user, { unread, page, limit }) {
  const pagination = paginate({ page, limit });
  const filter = { recipient: user._id };
  if (unread) filter.read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(NOTIFICATION_POPULATE),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: user._id, read: false }),
  ]);

  return { items, meta: { ...pagination.meta(total), unreadCount } };
}

/*
 * Reads and deletions are pushed to the user's own room, so their other tabs and devices update
 * their badge and list without refetching (the tab that made the change receives them too).
 */

export async function markNotificationRead(user, notificationId) {
  const notification = await Notification.findOne({ _id: notificationId, recipient: user._id });
  if (!notification) throw ApiError.notFound('Notification not found');

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    emitToUser(user._id, SERVER_EVENTS.NOTIFICATION_READ, {
      _id: notification._id,
      readAt: notification.readAt,
    });
  }
  return notification.populate(NOTIFICATION_POPULATE);
}

export async function markAllNotificationsRead(user) {
  const readAt = new Date();
  const { modifiedCount } = await Notification.updateMany(
    { recipient: user._id, read: false },
    { $set: { read: true, readAt } },
  );
  if (modifiedCount) emitToUser(user._id, SERVER_EVENTS.NOTIFICATIONS_READ_ALL, { readAt });
  return { updated: modifiedCount };
}

export async function deleteNotification(user, notificationId) {
  const { deletedCount } = await Notification.deleteOne({
    _id: notificationId,
    recipient: user._id,
  });
  if (!deletedCount) throw ApiError.notFound('Notification not found');
  emitToUser(user._id, SERVER_EVENTS.NOTIFICATION_DELETED, { _id: notificationId });
}

/*
 * Notifications are deleted along with the task, project or team they point to. Their recipients
 * are told at once, so no bell keeps showing (or counting) a notification that is gone.
 */

/**
 * Deletes the notifications of a task that is being deleted. Each recipient gets a
 * `notification:deleted` per notification, exactly as if they had deleted it themselves.
 */
export async function deleteTaskNotifications(taskId) {
  // Read first: once they are deleted, nothing tells whose lists they were in.
  const notifications = await Notification.find({ task: taskId }).select('recipient').lean();
  await Notification.deleteMany({ task: taskId });
  for (const { _id, recipient } of notifications) {
    emitToUser(recipient, SERVER_EVENTS.NOTIFICATION_DELETED, { _id });
  }
}

/**
 * Deletes the notifications matching `filter` in bulk (the cascade of a project or team deletion,
 * possibly many per user). Rather than one event per notification, every recipient who lost some
 * is asked once to refetch theirs (`notifications:refresh`).
 */
export async function bulkDeleteNotifications(filter) {
  const recipients = await Notification.distinct('recipient', filter);
  await Notification.deleteMany(filter);
  for (const recipient of recipients) {
    emitToUser(recipient, SERVER_EVENTS.NOTIFICATIONS_REFRESH, {});
  }
}
