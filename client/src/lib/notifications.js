import { ArrowRightLeft, Bell, Clock, MessageSquare, UserPlus, Users } from 'lucide-react';
import { getId } from '@/lib/ids';
import { taskBoardPath } from '@/lib/taskLinks';

/**
 * Presentation per notification type.
 * `badge` = solid colour for the small icon bubble on the actor avatar,
 * `tile` = neutral glyph style used when there is no actor (system notifications such as "due soon").
 */
const NOTIFICATION_META = {
  task_assigned: {
    label: 'Assigned to you',
    icon: UserPlus,
    badge: 'bg-fg text-canvas',
    tile: 'bg-surface text-fg-muted ring-1 ring-inset ring-line',
  },
  task_status_changed: {
    label: 'Status changed',
    icon: ArrowRightLeft,
    badge: 'bg-fg text-canvas',
    tile: 'bg-surface text-fg-muted ring-1 ring-inset ring-line',
  },
  task_commented: {
    label: 'New comment',
    icon: MessageSquare,
    badge: 'bg-fg text-canvas',
    tile: 'bg-surface text-fg-muted ring-1 ring-inset ring-line',
  },
  task_due_soon: {
    label: 'Due soon',
    icon: Clock,
    badge: 'bg-fg text-canvas',
    tile: 'bg-surface text-fg-muted ring-1 ring-inset ring-line',
  },
  team_member_added: {
    label: 'Added to a team',
    icon: Users,
    badge: 'bg-fg text-canvas',
    tile: 'bg-surface text-fg-muted ring-1 ring-inset ring-line',
  },
};

const DEFAULT_NOTIFICATION_META = {
  label: 'Notification',
  icon: Bell,
  badge: 'bg-fg text-canvas',
  tile: 'bg-surface text-fg-muted ring-1 ring-inset ring-line',
};

/** `{ label, icon, badge, tile }` of a notification type. */
export function getNotificationMeta(type) {
  return NOTIFICATION_META[type] ?? DEFAULT_NOTIFICATION_META;
}

/**
 * Where a notification should take the user when clicked:
 * `/projects/<projectId>?task=<taskId>` for task notifications (opens the task modal on the board),
 * `/teams/<teamId>` for team notifications, `/notifications` otherwise.
 */
export function getNotificationLink(notification) {
  if (!notification) return '/notifications';
  const projectId = getId(notification.project);
  const taskId = getId(notification.task);
  const teamId = getId(notification.team);

  if (projectId && taskId) return taskBoardPath(projectId, taskId);
  if (projectId) return `/projects/${projectId}`;
  if (teamId) return `/teams/${teamId}`;
  return '/notifications';
}
