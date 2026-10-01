import { useInfiniteQuery } from '@tanstack/react-query';
import { getActivityFeed } from '@/api/activity';
import { getProjectActivity } from '@/api/projects';
import { getTaskActivity } from '@/api/tasks';
import { queryKeys } from '@/lib/queryKeys';

const DEFAULT_LIMIT = 20;

/**
 * Cursor-paginated activity (`before` = oldest loaded timestamp); every page is
 * `{ items, meta: { nextCursor, hasMore } }`. Flatten with `flattenPages` from `@/lib/cache`.
 * New entries are prepended live by the `activity:created` socket handler.
 */
function activityQueryOptions(queryKey, fetchPage, { limit, enabled = true }) {
  return {
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage({ before: pageParam, limit }, { signal }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.hasMore ? (lastPage.meta.nextCursor ?? undefined) : undefined,
    enabled,
  };
}

/** Activity across all of the user's teams. */
export function useActivityFeed({ limit = DEFAULT_LIMIT } = {}) {
  return useInfiniteQuery(
    activityQueryOptions(queryKeys.activity.feed(), getActivityFeed, { limit }),
  );
}

export function useProjectActivity(projectId, { limit = DEFAULT_LIMIT } = {}) {
  return useInfiniteQuery(
    activityQueryOptions(
      queryKeys.activity.project(projectId),
      (params, config) => getProjectActivity(projectId, params, config),
      { limit, enabled: Boolean(projectId) },
    ),
  );
}

export function useTaskActivity(taskId, { limit = DEFAULT_LIMIT } = {}) {
  return useInfiniteQuery(
    activityQueryOptions(
      queryKeys.activity.task(taskId),
      (params, config) => getTaskActivity(taskId, params, config),
      { limit, enabled: Boolean(taskId) },
    ),
  );
}
