/**
 * Cache helpers shared by the mutation hooks and the real-time (Socket.IO) handlers.
 *
 * Every helper:
 * - is idempotent: applying the same server event twice (e.g. the socket echo of our own
 *   mutation) is harmless, and a copy older than the cached one (by `updatedAt`) is ignored;
 * - never creates cache entries: only queries somebody already loaded are patched;
 * - is fetch-safe: a write that lands while the same query is being fetched is replayed onto the
 *   fetch result, because that response may have left the server before the change happened.
 *
 * Board caches (`queryKeys.tasks.board(projectId)`) hold every task of a project sorted by
 * ascending `position`, so filtering a board by status yields correctly ordered columns.
 */
import { getId } from './ids';
import { queryKeys } from './queryKeys';

export { getId };

/** Gap between neighbouring task positions (mirrors the server's POSITION_GAP). */
const POSITION_GAP = 1024;

// ---------------------------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------------------------

const toTime = (iso) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? null : time;
};

/** True when `a` is a strictly newer version of the same document than `b` (by `updatedAt`). */
export function isNewerVersion(a, b) {
  const timeA = toTime(a?.updatedAt);
  const timeB = toTime(b?.updatedAt);
  return timeA !== null && timeB !== null && timeA > timeB;
}

// Updates waiting for an in-flight fetch of their query to land (Query -> updater[]).
const pendingReplays = new WeakMap();

/**
 * Applies `updater` to a cached query and writes the result when it changed. While the query is
 * fetching, the updater is also queued for replay onto the fetch result.
 */
function updateCachedQuery(queryClient, query, updater) {
  if (query.state.fetchStatus === 'fetching') replayAfterFetch(queryClient, query, updater);
  const current = query.state.data;
  if (current === undefined) return false;
  const next = updater(current);
  if (next === undefined || next === current) return false;
  queryClient.setQueryData(query.queryKey, next);
  return true;
}

/**
 * Re-applies `updater` once the query's in-flight fetch succeeds. Updaters are idempotent, so
 * replaying one onto a response that already contains the change is a no-op. A failed or
 * cancelled fetch keeps the cached data (with the update), so nothing is replayed then.
 */
function replayAfterFetch(queryClient, query, updater) {
  const queued = pendingReplays.get(query);
  if (queued) {
    queued.push(updater);
    return;
  }
  pendingReplays.set(query, [updater]);

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.query !== query) return;
    const { type, manual } = event.action ?? {};
    const settled =
      event.type === 'removed' ||
      (event.type === 'updated' && !manual && ['success', 'error', 'setState'].includes(type));
    if (!settled) return;

    unsubscribe();
    const updaters = pendingReplays.get(query) ?? [];
    pendingReplays.delete(query);
    if (event.type === 'updated' && type === 'success') {
      updaters.forEach((replay) => updateCachedQuery(queryClient, query, replay));
    }
  });
}

/** Applies `updater` to one cached query (exact key). Returns true when the cache changed. */
function updateQuery(queryClient, queryKey, updater) {
  const query = queryClient.getQueryCache().find({ queryKey, exact: true });
  return query ? updateCachedQuery(queryClient, query, updater) : false;
}

/** Applies `updater` to every cached query whose key starts with `queryKey`. */
function updateQueries(queryClient, queryKey, updater) {
  let changed = false;
  for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
    changed = updateCachedQuery(queryClient, query, updater) || changed;
  }
  return changed;
}

function invalidateAll(queryClient, queryKeyList) {
  queryKeyList.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
}

/**
 * Refetches notification lists once a project or team is gone. When its deletion removed
 * notifications, the server pushed `notifications:refresh` just before: a refetch that one
 * started is kept rather than restarted.
 */
function refreshNotificationsAfterCascade(queryClient) {
  queryClient.invalidateQueries(
    { queryKey: queryKeys.notifications.all },
    { cancelRefetch: false },
  );
}

/**
 * Removes the queries (exact keys) of resources that no longer exist. A query that a mounted view
 * still observes - typically the view closing because of the deletion - is cancelled now and
 * removed once its last observer is gone: removed earlier, it would be re-created by that view's
 * next render and request the deleted resource (a 404).
 */
function dropQueries(queryClient, queryKeyList) {
  const queryCache = queryClient.getQueryCache();
  for (const queryKey of queryKeyList) {
    const query = queryCache.find({ queryKey, exact: true });
    if (!query) continue;
    if (!query.getObserversCount()) {
      queryCache.remove(query);
      continue;
    }
    queryClient.cancelQueries({ queryKey, exact: true });
    const unsubscribe = queryCache.subscribe(({ type, query: target }) => {
      if (target !== query) return;
      if (type === 'removed') unsubscribe();
      else if (type === 'observerRemoved' && !query.getObserversCount()) {
        unsubscribe();
        queryCache.remove(query);
      }
    });
  }
}

/** Replaces the item with the same `_id` unless the cached copy is newer. */
function replaceById(items, item) {
  const index = items.findIndex((existing) => existing._id === item._id);
  if (index === -1 || isNewerVersion(items[index], item)) return items;
  const next = items.slice();
  next[index] = item;
  return next;
}

function withoutId(items, id) {
  if (!Array.isArray(items) || !items.some((item) => item._id === id)) return items;
  return items.filter((item) => item._id !== id);
}

/** Applies `update(items)` to a `{ items, meta }` page, keeping the page when nothing changed. */
function updatePageItems(page, update) {
  if (!Array.isArray(page?.items)) return page;
  const items = update(page.items);
  return items === page.items ? page : { ...page, items };
}

/** Updates the item `id` of a list with `update(item)`; same list when nothing changed. */
function updateById(items, id, update) {
  if (!Array.isArray(items)) return items;
  const index = items.findIndex((item) => item._id === id);
  if (index === -1) return items;
  const updated = update(items[index]);
  if (updated === items[index]) return items;
  const next = items.slice();
  next[index] = updated;
  return next;
}

// ---------------------------------------------------------------------------------------------
// Lists & ordering
// ---------------------------------------------------------------------------------------------

/** Flattens infinite-query pages (`{ items, meta }`) into one list, skipping duplicate ids. */
export function flattenPages(data) {
  const seen = new Set();
  const items = [];
  for (const page of data?.pages ?? []) {
    for (const item of page?.items ?? []) {
      if (seen.has(item._id)) continue;
      seen.add(item._id);
      items.push(item);
    }
  }
  return items;
}

/** A copy of `tasks` sorted by ascending `position` (ties broken by id for a stable order). */
export function sortByPosition(tasks) {
  return [...(tasks ?? [])].sort(
    (a, b) => a.position - b.position || String(a._id).localeCompare(String(b._id)),
  );
}

/**
 * Position of a task dropped into a column, using the server's `/move` algorithm so the
 * optimistic placement matches the final one. `columnTasks` are the target column's tasks
 * EXCLUDING the moving task; `prevTaskId` / `nextTaskId` are its neighbours as displayed.
 * - after `prevTaskId`: midway to prev's successor, or prev + GAP when prev is the last task;
 * - else before `nextTaskId`: midway from next's predecessor, or next - GAP when next is first;
 * - else at the end of the column (GAP when the column is empty).
 */
export function computeLocalPosition(columnTasks, prevTaskId, nextTaskId) {
  const column = sortByPosition(columnTasks);

  const prevIndex = prevTaskId ? column.findIndex((task) => task._id === prevTaskId) : -1;
  if (prevIndex !== -1) {
    const prev = column[prevIndex];
    const successor = column[prevIndex + 1];
    return successor ? (prev.position + successor.position) / 2 : prev.position + POSITION_GAP;
  }

  const nextIndex = nextTaskId ? column.findIndex((task) => task._id === nextTaskId) : -1;
  if (nextIndex !== -1) {
    const next = column[nextIndex];
    const predecessor = column[nextIndex - 1];
    return predecessor ? (predecessor.position + next.position) / 2 : next.position - POSITION_GAP;
  }

  const last = column[column.length - 1];
  return last ? last.position + POSITION_GAP : POSITION_GAP;
}

/**
 * Prepends `item` to the first page of a cached infinite query (`{ pages: [{ items }] }`).
 * No-op when the query isn't cached or already contains the item.
 */
export function prependToInfinite(queryClient, queryKey, item) {
  if (!item?._id) return;
  updateQuery(queryClient, queryKey, (data) => {
    if (!data?.pages?.length) return data;
    if (data.pages.some((page) => page?.items?.some((existing) => existing._id === item._id))) {
      return data;
    }
    const [first, ...rest] = data.pages;
    return { ...data, pages: [{ ...first, items: [item, ...(first?.items ?? [])] }, ...rest] };
  });
}

// ---------------------------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------------------------

/** The freshest cached copy of a task (detail, boards, search results, dashboard), if any. */
export function findCachedTask(queryClient, taskId) {
  if (!taskId) return undefined;
  const byId = (task) => task?._id === taskId;
  const candidates = [queryClient.getQueryData(queryKeys.tasks.detail(taskId))];
  for (const [, tasks] of queryClient.getQueriesData({ queryKey: queryKeys.tasks.boards() })) {
    candidates.push(tasks?.find?.(byId));
  }
  for (const [, page] of queryClient.getQueriesData({ queryKey: queryKeys.tasks.searches() })) {
    candidates.push(page?.items?.find?.(byId));
  }
  candidates.push(queryClient.getQueryData(queryKeys.dashboard)?.upcomingTasks?.find?.(byId));

  return candidates.reduce(
    (freshest, task) => (task && (!freshest || isNewerVersion(task, freshest)) ? task : freshest),
    undefined,
  );
}

function upsertIntoBoard(tasks, task) {
  if (!Array.isArray(tasks)) return tasks;
  const index = tasks.findIndex((existing) => existing._id === task._id);
  if (index === -1) return sortByPosition([...tasks, task]);
  const current = tasks[index];
  if (isNewerVersion(current, task)) return tasks;
  const next = tasks.slice();
  next[index] = task;
  return current.position === task.position ? next : sortByPosition(next);
}

/**
 * Writes a task into every cache holding it: its project board (inserted when missing), its
 * detail and any search results containing it. A cached copy with a newer `updatedAt` wins, so
 * late or duplicated events are ignored; optimistic copies keep the cached `updatedAt` and apply.
 * @returns {object | undefined} the freshest copy cached before the write
 */
export function upsertTaskInCaches(queryClient, task) {
  if (!task?._id) return undefined;
  const previous = findCachedTask(queryClient, task._id);
  const projectId = getId(task.project);
  if (projectId) {
    updateQuery(queryClient, queryKeys.tasks.board(projectId), (tasks) =>
      upsertIntoBoard(tasks, task),
    );
  }
  updateQuery(queryClient, queryKeys.tasks.detail(task._id), (cached) =>
    isNewerVersion(cached, task) ? cached : task,
  );
  updateQueries(queryClient, queryKeys.tasks.searches(), (page) =>
    updatePageItems(page, (items) => replaceById(items, task)),
  );
  return previous;
}

/** Removes a task from its board and from search results (detail caches are kept). */
export function removeTaskFromLists(queryClient, taskId, projectId) {
  const removeFromBoard = (tasks) => withoutId(tasks, taskId);
  if (projectId) updateQuery(queryClient, queryKeys.tasks.board(projectId), removeFromBoard);
  else updateQueries(queryClient, queryKeys.tasks.boards(), removeFromBoard);

  updateQueries(queryClient, queryKeys.tasks.searches(), (page) => {
    const next = updatePageItems(page, (items) => withoutId(items, taskId));
    if (next === page || typeof next.meta?.total !== 'number') return next;
    return { ...next, meta: { ...next.meta, total: Math.max(0, next.meta.total - 1) } };
  });
}

/** The queries holding one task's own data: detail, comments and activity. */
const taskQueryKeys = (taskId) => [
  queryKeys.tasks.detail(taskId),
  queryKeys.comments(taskId),
  queryKeys.activity.task(taskId),
];

/** Removes a deleted task everywhere: board, search results, detail, comments and activity. */
export function removeTaskFromCaches(queryClient, taskId, projectId) {
  removeTaskFromLists(queryClient, taskId, projectId);
  dropQueries(queryClient, taskQueryKeys(taskId));
}

/** Applies server re-balanced positions (`[{ _id, position }]`) to a board. */
export function patchTaskPositions(queryClient, projectId, positions) {
  if (!positions?.length) return;
  const positionById = new Map(positions.map(({ _id, position }) => [_id, position]));
  updateQuery(queryClient, queryKeys.tasks.board(projectId), (tasks) => {
    if (!Array.isArray(tasks)) return tasks;
    let changed = false;
    const next = tasks.map((task) => {
      const position = positionById.get(task._id);
      if (position === undefined || position === task.position) return task;
      changed = true;
      return { ...task, position };
    });
    return changed ? sortByPosition(next) : tasks;
  });
}

/** Sets a task's `commentCount` on its board, detail and search results. */
export function setTaskCommentCount(queryClient, taskId, projectId, count) {
  if (!Number.isFinite(count)) return;
  const patch = (task) => (task.commentCount === count ? task : { ...task, commentCount: count });
  const patchList = (tasks) => updateById(tasks, taskId, patch);

  if (projectId) updateQuery(queryClient, queryKeys.tasks.board(projectId), patchList);
  else updateQueries(queryClient, queryKeys.tasks.boards(), patchList);
  updateQuery(queryClient, queryKeys.tasks.detail(taskId), patch);
  updateQueries(queryClient, queryKeys.tasks.searches(), (page) =>
    updatePageItems(page, patchList),
  );
}

/**
 * Invalidates queries aggregated from tasks: search results, the dashboard and - when tasks were
 * created, deleted or changed status (`counts`) - project task counts. Only mounted queries
 * refetch; the others are refreshed on their next use.
 */
export function invalidateTaskAggregates(queryClient, { counts = false } = {}) {
  invalidateAll(queryClient, [queryKeys.tasks.searches(), queryKeys.dashboard]);
  if (counts) queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
}

/** Ids of a project's cached tasks: its board and any task detail loaded on its own. */
function getCachedProjectTaskIds(queryClient, projectId) {
  const board = queryClient.getQueryData(queryKeys.tasks.board(projectId));
  const taskIds = new Set(Array.isArray(board) ? board.map((task) => task._id) : []);
  const details = queryClient.getQueriesData({ queryKey: queryKeys.tasks.details() });
  for (const [queryKey, task] of details) {
    if (getId(task?.project) === projectId) taskIds.add(queryKey[2]);
  }
  return taskIds;
}

/**
 * Invalidates a project's board plus the cached details and comments of its tasks.
 * With `refetchType: 'none'` they are only marked stale (refetched on next use) - used when the
 * client stops receiving the project's real-time updates.
 */
export function invalidateProjectTasks(queryClient, projectId, { refetchType = 'active' } = {}) {
  const taskIds = getCachedProjectTaskIds(queryClient, projectId);
  return queryClient.invalidateQueries({
    refetchType,
    predicate: ({ queryKey: [scope, kind, id] }) =>
      (scope === 'tasks' && kind === 'board' && id === projectId) ||
      (scope === 'tasks' && kind === 'detail' && taskIds.has(id)) ||
      (scope === 'comments' && taskIds.has(kind)),
  });
}

// ---------------------------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------------------------

const byCreatedAt = (a, b) => (toTime(a.createdAt) ?? 0) - (toTime(b.createdAt) ?? 0);

/** Adds or updates a comment in `comments(taskId)` (kept oldest first). */
export function upsertCommentInCache(queryClient, taskId, comment) {
  if (!comment?._id) return;
  updateQuery(queryClient, queryKeys.comments(taskId), (comments) => {
    if (!Array.isArray(comments)) return comments;
    return comments.some((existing) => existing._id === comment._id)
      ? replaceById(comments, comment)
      : [...comments, comment].sort(byCreatedAt);
  });
}

export function removeCommentFromCache(queryClient, taskId, commentId) {
  updateQuery(queryClient, queryKeys.comments(taskId), (comments) =>
    withoutId(comments, commentId),
  );
}

/** Number of comments in the cached thread of a task (`undefined` when not cached). */
export function getCachedCommentCount(queryClient, taskId) {
  return queryClient.getQueryData(queryKeys.comments(taskId))?.length;
}

// ---------------------------------------------------------------------------------------------
// Projects & teams
// ---------------------------------------------------------------------------------------------

/** The cached project (detail first, then any list), if any. */
export function findCachedProject(queryClient, projectId) {
  const detail = queryClient.getQueryData(queryKeys.projects.detail(projectId));
  if (detail) return detail;
  for (const [, projects] of queryClient.getQueriesData({ queryKey: queryKeys.projects.lists() })) {
    const project = projects?.find?.((item) => item._id === projectId);
    if (project) return project;
  }
  return undefined;
}

/** Project fields that tasks embed (`task.project`): changing them makes cached tasks stale. */
const TASK_EMBEDDED_PROJECT_FIELDS = ['name', 'key', 'color'];

/**
 * Applies a saved project - list shape (`team` is `{ _id, name }`, `myRole` may be missing) -
 * by merging it into the cached detail (keeping the populated team and the caller's role) and
 * refreshing project lists, plus the project's tasks when the fields they embed changed.
 */
export function syncProjectInCaches(queryClient, project) {
  if (!project?._id) return;
  const previous = findCachedProject(queryClient, project._id);

  updateQuery(queryClient, queryKeys.projects.detail(project._id), (cached) => {
    if (isNewerVersion(cached, project)) return cached;
    const team = project.team?.members
      ? project.team
      : { ...cached.team, ...(typeof project.team === 'object' ? project.team : {}) };
    return { ...cached, ...project, team, myRole: project.myRole ?? cached.myRole };
  });

  invalidateAll(queryClient, [
    queryKeys.projects.lists(),
    queryKeys.tasks.searches(),
    queryKeys.dashboard,
  ]);
  const embeddedFieldsChanged = TASK_EMBEDDED_PROJECT_FIELDS.some(
    (field) => previous && previous[field] !== project[field],
  );
  if (embeddedFieldsChanged) invalidateProjectTasks(queryClient, project._id);
}

/** Project lists' server order: most recently active first, then newest. */
const byRecentActivity = (a, b) =>
  (toTime(b.lastActivityAt) ?? 0) - (toTime(a.lastActivityAt) ?? 0) ||
  String(b._id).localeCompare(String(a._id));

/**
 * Moves a project's `lastActivityAt` forward to `at` (the `createdAt` of its newest activity) in
 * its detail and in project lists, which are re-sorted the way the server sorts them.
 */
export function touchProjectActivity(queryClient, projectId, at) {
  const time = toTime(at);
  if (!projectId || time === null) return;
  const touch = (project) =>
    (toTime(project.lastActivityAt) ?? 0) >= time ? project : { ...project, lastActivityAt: at };

  updateQuery(queryClient, queryKeys.projects.detail(projectId), touch);
  updateQueries(queryClient, queryKeys.projects.lists(), (projects) => {
    const next = updateById(projects, projectId, touch);
    return next === projects ? projects : next.sort(byRecentActivity);
  });
}

/** Drops the caches of a project and of its tasks (see `dropQueries`). */
function dropProjectQueries(queryClient, projectId) {
  const taskIds = [...getCachedProjectTaskIds(queryClient, projectId)];
  dropQueries(queryClient, [
    queryKeys.projects.detail(projectId),
    queryKeys.tasks.board(projectId),
    queryKeys.activity.project(projectId),
    ...taskIds.flatMap(taskQueryKeys),
  ]);
}

/** Drops a deleted project: its caches and list entries, then refreshes what aggregates it. */
export function removeProjectFromCaches(queryClient, projectId) {
  dropProjectQueries(queryClient, projectId);
  updateQueries(queryClient, queryKeys.projects.lists(), (projects) =>
    withoutId(projects, projectId),
  );
  invalidateAll(queryClient, [
    queryKeys.projects.lists(),
    queryKeys.teams.all,
    queryKeys.tasks.searches(),
    queryKeys.dashboard,
  ]);
  refreshNotificationsAfterCascade(queryClient);
}

/** Merged team: incoming fields over cached ones, `myRole` derived from members when missing. */
function mergeTeam(cached, team, currentUserId) {
  if (cached && isNewerVersion(cached, team)) return cached;
  const membership = currentUserId
    ? team.members?.find((member) => getId(member.user) === currentUserId)
    : undefined;
  return { ...cached, ...team, myRole: team.myRole ?? membership?.role ?? cached?.myRole };
}

/**
 * Writes a saved team into its detail cache. Socket payloads omit `myRole`, so it is derived
 * from the member list using `currentUserId`. `seed` creates the entry when it isn't cached.
 */
export function setTeamInCache(queryClient, team, { currentUserId, seed = false } = {}) {
  if (!team?._id) return;
  const queryKey = queryKeys.teams.detail(team._id);
  if (seed && queryClient.getQueryData(queryKey) === undefined) {
    queryClient.setQueryData(queryKey, mergeTeam(undefined, team, currentUserId));
  } else {
    updateQuery(queryClient, queryKey, (cached) => mergeTeam(cached, team, currentUserId));
  }
}

/** Drops the caches of a team the user lost access to (deleted, removed or left). */
export function removeTeamFromCaches(queryClient, teamId) {
  const projectIds = new Set();
  for (const [, data] of queryClient.getQueriesData({ queryKey: queryKeys.projects.all })) {
    for (const project of Array.isArray(data) ? data : [data]) {
      if (project && getId(project.team) === teamId) projectIds.add(project._id);
    }
  }
  dropQueries(queryClient, [queryKeys.teams.detail(teamId)]);
  projectIds.forEach((projectId) => dropProjectQueries(queryClient, projectId));
  // Drop the team and its projects from cached lists right away (sidebar, /teams, /projects)
  // instead of showing them until the refetch below completes.
  updateQuery(queryClient, queryKeys.teams.list(), (teams) => withoutId(teams, teamId));
  updateQueries(queryClient, queryKeys.projects.lists(), (projects) => {
    if (!Array.isArray(projects)) return projects;
    const kept = projects.filter((project) => getId(project.team) !== teamId);
    return kept.length === projects.length ? projects : kept;
  });
  // Lists only: the dropped project details may still be observed by a closing board.
  invalidateAll(queryClient, [
    queryKeys.teams.list(),
    queryKeys.projects.lists(),
    queryKeys.tasks.searches(),
    queryKeys.activity.feed(),
    queryKeys.dashboard,
  ]);
  refreshNotificationsAfterCascade(queryClient);
}

// ---------------------------------------------------------------------------------------------
// Notifications (every cached list is `{ items, meta: { total, unreadCount, ... } }`)
// ---------------------------------------------------------------------------------------------

/** The cached copy of a notification (any list), if any. */
export function findCachedNotification(queryClient, notificationId) {
  for (const [, data] of queryClient.getQueriesData({ queryKey: queryKeys.notifications.all })) {
    const notification = data?.items?.find?.((item) => item._id === notificationId);
    if (notification) return notification;
  }
  return undefined;
}

const withUnreadCount = (meta, unreadCount) =>
  meta ? { ...meta, unreadCount: Math.max(0, unreadCount) } : meta;

/**
 * Marks a notification read (at `readAt`, default now) in every cached list and decrements the
 * (global) unread count.
 * @returns {boolean} false when the notification isn't cached or is already read
 */
export function markNotificationReadInCache(queryClient, notificationId, readAt) {
  const target = findCachedNotification(queryClient, notificationId);
  if (!target || target.read) return false;
  const stamp = readAt ?? new Date().toISOString();
  updateQueries(queryClient, queryKeys.notifications.all, (data) => {
    if (!Array.isArray(data?.items)) return data;
    const item = data.items.find((entry) => entry._id === notificationId);
    if (item?.read) return data; // this copy already shows it read (e.g. a newer fetch)
    return {
      ...data,
      items: data.items.map((entry) =>
        entry === item ? { ...entry, read: true, readAt: stamp } : entry,
      ),
      meta: withUnreadCount(data.meta, (data.meta?.unreadCount ?? 1) - 1),
    };
  });
  return true;
}

/**
 * Marks cached notifications read - all of them, or only those created up to `readAt` (the
 * server's "read all" time; later ones stay unread) - and sets each list's unread count to what
 * remains unread in it.
 */
export function markAllNotificationsReadInCache(queryClient, readAt) {
  const cutoff = toTime(readAt);
  const stamp = readAt ?? new Date().toISOString();
  const isCovered = (item) => cutoff === null || (toTime(item.createdAt) ?? 0) <= cutoff;
  updateQueries(queryClient, queryKeys.notifications.all, (data) => {
    if (!Array.isArray(data?.items)) return data;
    const items = data.items.map((item) =>
      item.read || !isCovered(item) ? item : { ...item, read: true, readAt: stamp },
    );
    const unreadCount = items.filter((item) => !item.read).length;
    const changed = items.some((item, index) => item !== data.items[index]);
    if (!changed && data.meta?.unreadCount === unreadCount) return data;
    return { ...data, items, meta: withUnreadCount(data.meta, unreadCount) };
  });
}

/** Removes a notification from every cached list, adjusting totals and the unread count. */
export function removeNotificationFromCache(queryClient, notificationId) {
  const target = findCachedNotification(queryClient, notificationId);
  if (!target) return;
  updateQueries(queryClient, queryKeys.notifications.all, (data) => {
    if (!Array.isArray(data?.items)) return data;
    const items = withoutId(data.items, notificationId);
    const meta = data.meta && {
      ...data.meta,
      total: Math.max(0, (data.meta.total ?? 0) - (items === data.items ? 0 : 1)),
      unreadCount: Math.max(0, (data.meta.unreadCount ?? 0) - (target.read ? 0 : 1)),
    };
    return { ...data, items, meta };
  });
}

// ---------------------------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------------------------

const PROFILE_FIELDS = ['name', 'email', 'title', 'avatarColor'];

/**
 * `value` (any cached JSON) with every populated copy of `user` - an object with the user's `_id`
 * and an `email` - carrying the new profile. Unchanged branches keep their identity. Snapshots
 * such as activity `meta` (`{ _id, name }`) are left as recorded.
 */
function withUserProfile(value, user) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const updated = withUserProfile(item, user);
      changed ||= updated !== item;
      return updated;
    });
    return changed ? next : value;
  }
  if (!value || typeof value !== 'object') return value;
  if (value._id === user._id && 'email' in value) {
    const stale = PROFILE_FIELDS.filter((field) => field in user && value[field] !== user[field]);
    return stale.length
      ? { ...value, ...Object.fromEntries(stale.map((field) => [field, user[field]])) }
      : value;
  }
  let next = value;
  for (const [key, child] of Object.entries(value)) {
    const updated = withUserProfile(child, user);
    if (updated === child) continue;
    if (next === value) next = { ...value };
    next[key] = updated;
  }
  return next;
}

/**
 * Applies a user's new profile (`UserPublic`) to every cached copy - the signed-in user, team
 * members, assignees, authors, actors... - so names and avatars update without refetching.
 */
export function patchUserInCaches(queryClient, user) {
  if (!user?._id) return;
  for (const query of queryClient.getQueryCache().getAll()) {
    updateCachedQuery(queryClient, query, (data) => withUserProfile(data, user));
  }
}
