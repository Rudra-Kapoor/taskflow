import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, BellRing, Check, CheckCheck, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { LoadingBar } from '@/components/mytasks/LoadingBar';
import { Pagination } from '@/components/mytasks/Pagination';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import {
  NOTIFICATION_PREVIEW_PARAMS,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/queries/notifications';
import { cn } from '@/lib/cn';
import { formatDayHeading, getDayKey } from '@/lib/format';
import { getNotificationLink, getNotificationMeta } from '@/lib/notifications';
import { updateSearchParams } from '@/lib/searchParams';

const PAGE_SIZE = 20;

/** Splits newest-first notifications into "Today", "Yesterday", "Monday, Sep 29"… groups. */
function groupByDay(items) {
  const groups = [];
  items.forEach((item) => {
    const key = getDayKey(item.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: formatDayHeading(item.createdAt), items: [item] });
  });
  return groups;
}

const showError = (fallback) => (error) => toast.error(getErrorMessage(error, fallback));
const markReadFailed = showError('Could not mark the notification as read.');
const deleteFailed = showError('Could not delete the notification.');
const markAllFailed = showError('Could not mark your notifications as read.');

export function NotificationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('filter') === 'unread' ? 'unread' : 'all';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '', 10) || 1);

  const { data, isLoading, isFetching, isError, error, refetch } = useNotifications({
    unread: tab === 'unread',
    page,
    limit: PAGE_SIZE,
  });
  // The small list shared with the bell: global totals for the tab counts.
  const { data: overview } = useNotifications(NOTIFICATION_PREVIEW_PARAMS);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const items = useMemo(() => data?.items ?? [], [data]);
  const groups = useMemo(() => groupByDay(items), [items]);
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 0;
  // Unknown (undefined) until a list has loaded: no "Unread 0" while loading.
  const unreadCount = data?.meta?.unreadCount ?? overview?.meta?.unreadCount;
  const allCount = tab === 'all' ? data?.meta?.total : overview?.meta?.total;
  const showCounts = !isLoading && !(isError && !data);
  useDocumentTitle(unreadCount ? `(${unreadCount}) Notifications` : 'Notifications');

  const setQuery = useCallback(
    (changes) => {
      updateSearchParams(
        setSearchParams,
        (params) => {
          Object.entries(changes).forEach(([key, value]) => {
            if (value) params.set(key, String(value));
            else params.delete(key);
          });
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Deleting or reading the last items of a page can leave it empty: step back.
  useEffect(() => {
    if (!isFetching && totalPages > 0 && page > totalPages) {
      setQuery({ page: totalPages > 1 ? totalPages : null });
    }
  }, [isFetching, totalPages, page, setQuery]);

  const openNotification = (notification) => {
    if (!notification.read) {
      markRead.mutate(notification._id, { onError: markReadFailed });
    }
    navigate(getNotificationLink(notification));
  };

  const markAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read'),
      onError: markAllFailed,
    });
  };

  let content;
  if (isError && !data) {
    content = <ErrorState title="Couldn’t load notifications" error={error} onRetry={refetch} />;
  } else if (isLoading) {
    content = <NotificationsSkeleton />;
  } else if (items.length === 0) {
    content =
      tab === 'unread' ? (
        <EmptyState
          icon={CheckCheck}
          title="You’re all caught up"
          description="No unread notifications. New ones appear here the moment they arrive."
          action={
            (allCount ?? 0) > 0 && (
              <Button variant="secondary" onClick={() => setQuery({ filter: null, page: null })}>
                View all notifications
              </Button>
            )
          }
        />
      ) : (
        <EmptyState
          icon={BellRing}
          title="You’re all caught up"
          description="We’ll let you know when someone assigns you a task, comments on your work or adds you to a team."
        />
      );
  } else {
    content = (
      <div>
        {groups.map((group, index) => (
          <section
            key={group.key}
            aria-label={group.label}
            className={cn(index > 0 && 'border-t border-line')}
          >
            {/* Day eyebrow, bracketed by hairlines like a section rule, on the avatars' edge. */}
            <h2 className="eyebrow flex items-baseline justify-between gap-3 border-b border-line pb-2 pl-8 pr-4 pt-4 sm:pr-5">
              {group.label}
              <span aria-hidden="true" className="tabular-nums text-fg-subtle">
                {group.items.length}
              </span>
            </h2>
            <ul className="divide-y divide-line">
              {group.items.map((notification) => (
                <NotificationRow
                  key={notification._id}
                  notification={notification}
                  onOpen={openNotification}
                  onMarkRead={() =>
                    markRead.mutate(notification._id, { onError: markReadFailed })
                  }
                  onDelete={() =>
                    deleteNotification.mutate(notification._id, { onError: deleteFailed })
                  }
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Inbox"
        icon={Bell}
        title="Notifications"
        description="Assignments, status changes, comments and reminders about your work."
        actions={
          <Button
            variant="secondary"
            icon={CheckCheck}
            onClick={markAll}
            loading={markAllRead.isPending}
            disabled={!unreadCount}
          >
            Mark all as read
          </Button>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-12">
        <div className="min-w-0">
          <Tabs
            aria-label="Filter notifications"
            className="mb-5"
            value={tab}
            onChange={(value) =>
              setQuery({ filter: value === 'unread' ? 'unread' : null, page: null })
            }
            tabs={[
              { value: 'all', label: 'All', count: showCounts ? allCount : undefined },
              { value: 'unread', label: 'Unread', count: showCounts ? unreadCount : undefined },
            ]}
          />
          <Card padding={false} className="relative overflow-hidden">
            <LoadingBar active={isFetching && !isLoading} />
            {content}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={items.length ? total : 0}
              noun="notification"
              onPageChange={(next) => setQuery({ page: next > 1 ? next : null })}
              className="pl-8 sm:pl-8"
            />
          </Card>
        </div>
        <NotificationGuide />
      </div>
    </div>
  );
}

const TYPE_DESCRIPTIONS = {
  task_assigned: 'Someone assigns a task to you.',
  task_status_changed: 'A task you’re assigned to or created moves to another status.',
  task_commented: 'Someone comments on a task you’re assigned to or created.',
  task_due_soon: 'A task assigned to you is due within the next 24 hours.',
  team_member_added: 'You’re added to a team.',
};

/**
 * Explains what triggers a notification (you never get notified about your own actions): a quiet
 * aside set off by a hairline, the type icons doubling as a legend for the badges on avatars.
 */
function NotificationGuide() {
  return (
    <aside
      aria-labelledby="notification-guide-title"
      className="border-t border-line pt-6 lg:sticky lg:top-0 lg:mt-[3.75rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1"
    >
      <h2 id="notification-guide-title" className="text-sm font-semibold text-fg">
        What you’re notified about
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
        Only work that involves you, delivered live. Your own actions never notify you.
      </p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {Object.entries(TYPE_DESCRIPTIONS).map(([type, description]) => {
          const meta = getNotificationMeta(type);
          const Icon = meta.icon;
          return (
            <li key={type} className="flex gap-3 py-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-fg">{meta.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** A notification with its quick actions (mark as read, delete), laid out by NotificationItem. */
function NotificationRow({ notification, onOpen, onMarkRead, onDelete }) {
  return (
    <li>
      <NotificationItem
        notification={notification}
        // Full-bleed rows between the list's hairlines; the left padding stays the item's own
        // (its unread dot hangs in that gutter), the right edge lines up with the day counts.
        className="rounded-none sm:pr-5"
        onClick={() => onOpen(notification)}
        actions={
          <>
            {!notification.read && (
              <IconButton icon={Check} label="Mark as read" size="sm" onClick={onMarkRead} />
            )}
            <IconButton
              icon={Trash2}
              label="Delete notification"
              size="sm"
              variant="danger"
              onClick={onDelete}
            />
          </>
        }
      />
    </li>
  );
}

function NotificationsSkeleton() {
  return (
    <ul className="divide-y divide-line" aria-label="Loading notifications">
      <li className="pb-2 pl-8 pr-4 pt-4 sm:pr-5" aria-hidden="true">
        <Skeleton className="h-3 w-16" />
      </li>
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex gap-3 py-3.5 pl-8 pr-4 sm:pr-5" aria-hidden="true">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-3.5" style={{ width: `${[85, 70, 90, 65, 80, 75][index]}%` }} />
            <Skeleton className="h-3 w-32" />
          </div>
        </li>
      ))}
    </ul>
  );
}
