import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Bell, BellRing, CheckCheck } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Badge, EmptyState, ErrorState, IconButton, Popover, Skeleton } from '@/components/ui';
import {
  NOTIFICATION_PREVIEW_PARAMS,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/hooks/queries/notifications';
import { formatBadgeCount } from '@/lib/format';
import { getNotificationLink } from '@/lib/notifications';

/** Bell button with unread badge; opens a panel with the latest notifications. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const unreadCount = useUnreadCount() ?? 0;

  return (
    <>
      <IconButton
        ref={anchorRef}
        icon={Bell}
        label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {unreadCount > 0 && (
          <span
            key={unreadCount}
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] animate-scale-in items-center justify-center rounded-full bg-rose-600 px-1 text-2xs font-semibold leading-none text-white ring-2 ring-surface"
          >
            {formatBadgeCount(unreadCount)}
          </span>
        )}
      </IconButton>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        aria-label="Notifications"
        className="w-[380px] max-w-[calc(100vw-1rem)] overflow-hidden"
      >
        <NotificationPanel onClose={() => setOpen(false)} />
      </Popover>
    </>
  );
}

function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useNotifications(
    NOTIFICATION_PREVIEW_PARAMS,
  );
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const unreadCount = data?.meta?.unreadCount ?? items.filter((item) => !item.read).length;

  const handleOpen = (notification) => {
    if (!notification.read) {
      markRead.mutate(notification._id, {
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      });
    }
    onClose();
    navigate(getNotificationLink(notification));
  };

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
    });
  };

  return (
    <div className="flex max-h-[min(36rem,calc(100vh-6rem))] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-fg">Notifications</h2>
          {unreadCount > 0 && (
            <Badge color="brand" size="sm">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:text-fg-subtle dark:text-brand-400 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Mark all read
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {isLoading ? (
          <ul className="space-y-1" aria-label="Loading notifications">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex gap-3 px-2.5 py-2.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </li>
            ))}
          </ul>
        ) : isError ? (
          <ErrorState compact title="Couldn't load notifications" error={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon={BellRing}
            title="You're all caught up"
            description="We'll let you know when someone assigns, moves or comments on your tasks."
          />
        ) : (
          <ul className="space-y-0.5">
            {items.map((notification) => (
              <li key={notification._id}>
                <NotificationItem
                  notification={notification}
                  onClick={() => handleOpen(notification)}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line p-1.5">
        <Link
          to="/notifications"
          onClick={onClose}
          className="focus-ring group flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          View all notifications
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
