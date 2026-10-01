import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Bell, BellRing } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { EmptyState, ErrorState, IconButton, Popover, Skeleton } from '@/components/ui';
import {
  NOTIFICATION_PREVIEW_PARAMS,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/hooks/queries/notifications';
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
          // A quiet vermilion dot (the count is in the label, the panel and the sidebar).
          <span
            key={unreadCount}
            aria-hidden="true"
            className="absolute right-[8px] top-[8px] h-[7px] w-[7px] animate-scale-in rounded-full bg-brand-500 ring-2 ring-canvas"
          />
        )}
      </IconButton>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        aria-label="Notifications"
        className="w-[400px] max-w-[calc(100vw-1rem)] overflow-hidden"
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
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line pl-4 pr-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.005em] text-fg">Notifications</h2>
          {unreadCount > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-brand-700 dark:text-brand-400">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="focus-ring shrink-0 rounded-sm px-1 py-0.5 text-xs font-medium text-fg-muted underline decoration-line-strong underline-offset-[3px] transition-colors hover:text-fg hover:decoration-fg disabled:pointer-events-none disabled:text-fg-subtle disabled:no-underline"
        >
          Mark all read
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <ul className="divide-y divide-line" aria-label="Loading notifications">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex gap-3 py-3 pl-7 pr-4">
                <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </li>
            ))}
          </ul>
        ) : isError ? (
          <div className="p-2">
            <ErrorState
              compact
              title="Couldn't load notifications"
              error={error}
              onRetry={refetch}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="p-2">
            <EmptyState
              compact
              icon={BellRing}
              title="You're all caught up"
              description="We'll let you know when someone assigns, moves or comments on your tasks."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((notification) => (
              <li key={notification._id}>
                <NotificationItem
                  notification={notification}
                  onClick={() => handleOpen(notification)}
                  compact
                  className="rounded-none"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to="/notifications"
        onClick={onClose}
        className="group flex h-11 shrink-0 items-center justify-between border-t border-line px-4 text-[13px] font-medium text-fg outline-none transition-colors hover:bg-surface-muted/60 focus-visible:bg-surface-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        View all notifications
        <ArrowRight
          className="h-4 w-4 text-fg-subtle transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-fg"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
