import { useMemo } from 'react';
import { ChevronDown, History } from 'lucide-react';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { flattenPages } from '@/lib/cache';
import { cn } from '@/lib/cn';
import { formatDayHeading, getDayKey } from '@/lib/format';
import { ActivityItem } from './ActivityItem';

/** Groups items (already newest-first) under day headings, dropping duplicate ids. */
function groupByDay(items) {
  const seen = new Set();
  const groups = [];
  items.forEach((item) => {
    if (!item?._id || seen.has(item._id)) return;
    seen.add(item._id);
    const key = getDayKey(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: formatDayHeading(item.createdAt), items: [item] });
  });
  return groups;
}

function ActivitySkeleton({ rows, compact }) {
  return (
    <ul className="space-y-5" aria-label="Loading activity">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex gap-3">
          <Skeleton className={cn('shrink-0 rounded-full', compact ? 'h-6 w-6' : 'h-8 w-8')} />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton
              className="h-3.5"
              style={{ width: `${[85, 65, 75, 55, 80, 60][index % 6]}%` }}
            />
            <Skeleton className="h-3 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Activity timeline for any infinite activity query (`useActivityFeed`, `useProjectActivity`,
 * `useTaskActivity`): skeletons, error / empty states, day groups and "Load more".
 */
export function ActivityFeed({
  query,
  emptyTitle = 'No activity yet',
  emptyDescription = 'Changes to tasks, projects and teams will show up here as they happen.',
  showProject = false,
  compact = false,
  className,
}) {
  const items = useMemo(() => flattenPages(query?.data) ?? [], [query?.data]);
  const groups = useMemo(() => groupByDay(items), [items]);

  if (query?.isLoading) {
    return <ActivitySkeleton rows={compact ? 4 : 6} compact={compact} />;
  }

  if (query?.isError && items.length === 0) {
    return (
      <ErrorState
        compact
        title="Couldn't load activity"
        error={query.error}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        compact={compact}
        icon={History}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className={cn(compact ? 'space-y-5' : 'space-y-7', className)}>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h3 className="mb-3.5 flex items-center gap-3 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            {group.label}
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </h3>
          <ol className={compact ? 'space-y-4' : 'space-y-5'}>
            {group.items.map((activity, index) => (
              <li key={activity._id} className="relative">
                {index < group.items.length - 1 && (
                  // Timeline connector from this avatar down to the next one.
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute w-px bg-line',
                      compact ? '-bottom-4 left-3 top-8' : '-bottom-5 left-4 top-10',
                    )}
                  />
                )}
                <ActivityItem activity={activity} showProject={showProject} compact={compact} />
              </li>
            ))}
          </ol>
        </section>
      ))}

      {query?.hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronDown}
            loading={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
