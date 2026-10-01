import { ArrowRightLeft, Bell, Clock, MessageSquare, UserPlus, Users } from 'lucide-react';
import { getId } from '@/lib/ids';
import { taskBoardPath } from '@/lib/taskLinks';

/**
 * Presentation per notification type.
 * `badge` = solid colour for the small icon bubble on the actor avatar,
 * `tile` = soft colours used when there is no actor (system notifications such as "due soon").
 */
const NOTIFICATION_META = {
  task_assigned: {
    label: 'Assigned to you',
    icon: UserPlus,
    badge: 'bg-violet-500 text-white',
    tile: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  task_status_changed: {
    label: 'Status changed',
    icon: ArrowRightLeft,
    badge: 'bg-blue-500 text-white',
    tile: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  task_commented: {
    label: 'New comment',
    icon: MessageSquare,
    badge: 'bg-sky-500 text-white',
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  task_due_soon: {
    label: 'Due soon',
    icon: Clock,
    badge: 'bg-amber-500 text-white',
    tile: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  team_member_added: {
    label: 'Added to a team',
    icon: Users,
    badge: 'bg-emerald-500 text-white',
    tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
};

const DEFAULT_NOTIFICATION_META = {
  label: 'Notification',
  icon: Bell,
  badge: 'bg-brand-500 text-white',
  tile: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
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
