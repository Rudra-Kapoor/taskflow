import { createElement } from 'react';
import { MutationObserver } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { markNotificationReadOptions } from '@/hooks/queries/notifications';
import {
  findCachedNotification,
  findCachedProject,
  findCachedTask,
  invalidateProjectTasks,
  invalidateTaskAggregates,
  isNewerVersion,
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
  patchTaskPositions,
  patchUserInCaches,
  prependToInfinite,
  removeCommentFromCache,
  removeNotificationFromCache,
  removeProjectFromCaches,
  removeTaskFromCaches,
  removeTeamFromCaches,
  setTaskCommentCount,
  setTeamInCache,
  syncProjectInCaches,
  touchProjectActivity,
  upsertCommentInCache,
  upsertTaskInCaches,
} from '@/lib/cache';
import { getId } from '@/lib/ids';
import { getNotificationLink } from '@/lib/notifications';
import { rebaseOnPendingEdits } from '@/lib/optimisticTasks';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';
import { TASK_PARAM, closeTaskModal } from '@/lib/taskLinks';
import { NotificationToast } from './NotificationToast';

/** How long after one of our own mutations a matching socket event counts as its echo. */
const OWN_ACTION_ECHO_WINDOW_MS = 10_000;
const NOTIFICATION_TOAST_DURATION_MS = 6_000;
/** Activity actions that change project task counts. */
const COUNT_CHANGING_ACTIONS = new Set(['task.created', 'task.status_changed', 'task.deleted']);

/** Ids of what is on screen, read from the URL (BrowserRouter keeps window.location current). */
function getCurrentView() {
  const { pathname, search } = window.location;
  const [, section, id = null] = pathname.split('/');
  return {
    projectId: section === 'projects' ? id : null,
    teamId: section === 'teams' ? id : null,
    taskId: new URLSearchParams(search).get(TASK_PARAM),
  };
}

/**
 * True when a pending or just-finished mutation of this client matches `matches(variables)`:
 * the socket event is then the echo of our own action and must not be announced as someone
 * else's (the mutation already updated the cache and its UI).
 */
function isOwnRecentAction(queryClient, mutationKey, matches) {
  const now = Date.now();
  return queryClient
    .getMutationCache()
    .findAll({ mutationKey })
    .some(({ state }) => {
      const recent =
        state.status === 'pending' ||
        (state.status === 'success' && now - state.submittedAt < OWN_ACTION_ECHO_WINDOW_MS);
      return recent && matches(state.variables);
    });
}

/**
 * Wires Socket.IO server events to the query cache (FRONTEND.md "Real-time cache sync").
 * Events are also delivered to the user who caused them, so every handler is idempotent.
 *
 * @param {import('socket.io-client').Socket} socket
 * @param {object} options
 * @param {import('@tanstack/react-query').QueryClient} options.queryClient
 * @param {(to: string | number | object, options?: object) => void} options.navigate
 *   the router's `navigate`
 * @param {() => object | null} options.getUser the signed-in user
 * @param {(projectId: string) => boolean} [options.isWatchingProject] whether the project's
 *   room is joined. Outside the room its task events don't arrive, so the team-wide activity
 *   stream is used to refresh that project's task data instead.
 * @returns {() => void} removes every listener
 */
export function registerRealtimeHandlers(
  socket,
  { queryClient, navigate, getUser, isWatchingProject = () => false },
) {
  const invalidate = (...keys) => {
    keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  };

  /** Leaves any page showing something of `teamId`. Must run before its caches are dropped. */
  const exitTeamViews = (teamId) => {
    const view = getCurrentView();
    const projectTeamId = view.projectId
      ? getId(findCachedProject(queryClient, view.projectId)?.team)
      : null;
    const taskTeamId = view.taskId
      ? getId(findCachedTask(queryClient, view.taskId)?.project?.team)
      : null;
    if (view.teamId === teamId) navigate('/teams', { replace: true });
    else if (projectTeamId === teamId) navigate('/projects', { replace: true });
    else if (taskTeamId === teamId) closeTaskModal(navigate);
    else return false;
    return true;
  };

  const getCachedTeamName = (teamId) =>
    queryClient.getQueryData(queryKeys.teams.detail(teamId))?.name ??
    queryClient.getQueryData(queryKeys.teams.list())?.find?.((team) => team._id === teamId)?.name;

  // --- Tasks & comments (project room) ---------------------------------------------------------

  const handleTaskSaved = (task) => {
    if (!task?._id) return;
    // Our own in-flight edits of this task stay on top of the server copy (no flicker).
    const previous = upsertTaskInCaches(queryClient, rebaseOnPendingEdits(queryClient, task));
    if (previous && !isNewerVersion(task, previous)) return; // duplicate or late event
    invalidateTaskAggregates(queryClient, { counts: !previous || previous.status !== task.status });
  };

  const handleTaskDeleted = ({ _id: taskId, projectId } = {}) => {
    if (!taskId) return;
    // Our own deletion: the mutation updates the caches and closes its views itself.
    const isOwn = (variables) => variables?.taskId === taskId;
    if (isOwnRecentAction(queryClient, mutationKeys.tasks.delete, isOwn)) return;

    // Close the view first: its queries are only dropped once it is gone (no refetch of them).
    if (getCurrentView().taskId === taskId) {
      closeTaskModal(navigate);
      toast('This task was deleted.', { id: `task-deleted:${taskId}` });
    }
    removeTaskFromCaches(queryClient, taskId, projectId);
    invalidateTaskAggregates(queryClient, { counts: true });
  };

  const handleCommentSaved = ({ comment, taskId, projectId, commentCount } = {}) => {
    upsertCommentInCache(queryClient, taskId, comment);
    setTaskCommentCount(queryClient, taskId, projectId, commentCount);
  };

  const handleCommentDeleted = ({ _id: commentId, taskId, projectId, commentCount } = {}) => {
    removeCommentFromCache(queryClient, taskId, commentId);
    setTaskCommentCount(queryClient, taskId, projectId, commentCount);
  };

  // --- Activity (team rooms) -------------------------------------------------------------------

  /** Refreshes a project's task data from its activity when we are not in its room. */
  const syncFromActivity = (action, projectId, taskId) => {
    if (action === 'task.deleted') {
      if (taskId) handleTaskDeleted({ _id: taskId, projectId });
    } else if (action.startsWith('task.')) {
      invalidateTaskAggregates(queryClient, { counts: COUNT_CHANGING_ACTIONS.has(action) });
      invalidate(queryKeys.tasks.board(projectId));
      if (taskId) invalidate(queryKeys.tasks.detail(taskId));
    } else if (action.startsWith('comment.') && taskId) {
      invalidate(queryKeys.comments(taskId), queryKeys.tasks.detail(taskId));
    }
  };

  const handleActivity = (activity) => {
    if (!activity?._id) return;
    const projectId = getId(activity.project);
    const taskId = getId(activity.task);
    prependToInfinite(queryClient, queryKeys.activity.feed(), activity);
    if (projectId) {
      prependToInfinite(queryClient, queryKeys.activity.project(projectId), activity);
      // Not re-broadcast by the server: "last active" follows the project's newest activity.
      touchProjectActivity(queryClient, projectId, activity.createdAt);
    }
    if (taskId) prependToInfinite(queryClient, queryKeys.activity.task(taskId), activity);
    if (projectId && !isWatchingProject(projectId)) {
      syncFromActivity(activity.action ?? '', projectId, taskId);
    }
  };

  // --- Projects & teams (team / user rooms) ----------------------------------------------------

  const handleProjectDeleted = ({ _id: projectId } = {}) => {
    if (!projectId) return;
    if (isOwnRecentAction(queryClient, mutationKeys.projects.delete, (id) => id === projectId)) {
      return;
    }
    const name = findCachedProject(queryClient, projectId)?.name;
    const view = getCurrentView();
    const openTaskProjectId = getId(findCachedTask(queryClient, view.taskId)?.project);

    // Leave any view of the project first: its queries are dropped once it is gone.
    const message = name ? `The project "${name}" was deleted.` : 'This project was deleted.';
    const toastOptions = { id: `project-deleted:${projectId}` };
    if (view.projectId === projectId) {
      navigate('/projects', { replace: true });
      toast(message, toastOptions);
    } else if (openTaskProjectId === projectId) {
      closeTaskModal(navigate);
      toast(message, toastOptions);
    }
    removeProjectFromCaches(queryClient, projectId); // also refreshes notifications
  };

  const handleTeamUpdated = (team) => {
    setTeamInCache(queryClient, team, { currentUserId: getUser()?._id });
    // Project details embed the team (members are the assignable users); people searches hide
    // its current members.
    invalidate(queryKeys.teams.list(), queryKeys.projects.all, queryKeys.users.searches());
  };

  const handleTeamDeleted = ({ _id: teamId } = {}) => {
    if (!teamId) return;
    if (isOwnRecentAction(queryClient, mutationKeys.teams.delete, (id) => id === teamId)) return;
    const name = getCachedTeamName(teamId);
    if (exitTeamViews(teamId)) {
      const message = name ? `The team "${name}" was deleted.` : 'This team was deleted.';
      toast(message, { id: `team-deleted:${teamId}` });
    }
    removeTeamFromCaches(queryClient, teamId); // also refreshes notifications
  };

  const handleTeamRemoved = ({ teamId, teamName } = {}) => {
    if (!teamId) return;
    // Leaving on purpose: the leave mutation already cleaned up.
    const userId = getUser()?._id;
    const removeMemberKey = mutationKeys.teams.removeMember(teamId);
    if (isOwnRecentAction(queryClient, removeMemberKey, (id) => id === userId)) return;

    toast(`You were removed from ${teamName || 'a team'}.`, { id: `team-removed:${teamId}` });
    exitTeamViews(teamId);
    removeTeamFromCaches(queryClient, teamId); // also refreshes notifications
  };

  // --- Notifications (user room) ---------------------------------------------------------------

  const openNotification = (notification) => {
    if (!notification.read) {
      // Same optimistic mark-read as the notification bell.
      const observer = new MutationObserver(queryClient, markNotificationReadOptions(queryClient));
      observer
        .mutate(notification._id)
        .catch(() => {}) // rolled back by the mutation itself
        .finally(() => observer.reset());
    }
    navigate(getNotificationLink(notification));
  };

  const handleNotification = (notification) => {
    if (!notification?._id) return;
    // Defensive: never surface another account's notification (e.g. a stale connection).
    const userId = getUser()?._id;
    if (userId && notification.recipient && getId(notification.recipient) !== userId) return;

    invalidate(queryKeys.notifications.all);
    // No toast about the task already open on screen: the change is visible there.
    const taskId = getId(notification.task);
    if (taskId && getCurrentView().taskId === taskId) return;

    toast.custom(
      (t) =>
        createElement(NotificationToast, {
          notification,
          visible: t.visible,
          onOpen: () => {
            toast.dismiss(t.id);
            openNotification(notification);
          },
          onDismiss: () => toast.dismiss(t.id),
        }),
      { id: `notification:${notification._id}`, duration: NOTIFICATION_TOAST_DURATION_MS },
    );
  };

  /**
   * A read or deletion made in another tab or device (or the echo of ours) is applied to the
   * cached lists. One that isn't cached here may still have counted as unread, so the lists are
   * refetched instead - unless it is the echo of our own mutation, which refetches when settled.
   */
  const syncNotification = (notificationId, mutationKey, applyToCache) => {
    if (!notificationId) return;
    if (findCachedNotification(queryClient, notificationId)) applyToCache();
    else if (!isOwnRecentAction(queryClient, mutationKey, (id) => id === notificationId)) {
      invalidate(queryKeys.notifications.all);
    }
  };

  const handlers = {
    'task:created': handleTaskSaved,
    'task:updated': handleTaskSaved,
    'task:deleted': handleTaskDeleted,
    'tasks:reordered': ({ projectId, positions } = {}) => {
      patchTaskPositions(queryClient, projectId, positions);
    },
    'tasks:refresh': ({ projectId } = {}) => {
      invalidateProjectTasks(queryClient, projectId);
      invalidateTaskAggregates(queryClient, { counts: true });
    },
    'comment:created': handleCommentSaved,
    'comment:updated': handleCommentSaved,
    'comment:deleted': handleCommentDeleted,
    'activity:created': handleActivity,
    'project:created': () => {
      invalidate(queryKeys.projects.lists(), queryKeys.teams.all, queryKeys.dashboard);
    },
    'project:updated': (project) => syncProjectInCaches(queryClient, project),
    'project:deleted': handleProjectDeleted,
    'team:updated': handleTeamUpdated,
    'team:added': () => {
      invalidate(
        queryKeys.teams.all,
        queryKeys.projects.all,
        queryKeys.activity.feed(),
        queryKeys.dashboard,
      );
    },
    'team:deleted': handleTeamDeleted,
    'team:removed': handleTeamRemoved,
    // Names and avatars are embedded everywhere; viewer lists are re-sent by the server.
    'user:updated': (user) => patchUserInCaches(queryClient, user),
    'notification:created': handleNotification,
    'notification:read': ({ _id: notificationId, readAt } = {}) => {
      syncNotification(notificationId, mutationKeys.notifications.markRead, () =>
        markNotificationReadInCache(queryClient, notificationId, readAt),
      );
    },
    'notifications:read_all': ({ readAt } = {}) => {
      markAllNotificationsReadInCache(queryClient, readAt);
    },
    'notification:deleted': ({ _id: notificationId } = {}) => {
      syncNotification(notificationId, mutationKeys.notifications.delete, () =>
        removeNotificationFromCache(queryClient, notificationId),
      );
    },
    // Notifications were removed in bulk (a project or team was deleted).
    'notifications:refresh': () => invalidate(queryKeys.notifications.all),
  };

  // A malformed payload must not break the socket's event loop.
  const listeners = Object.entries(handlers).map(([event, handler]) => {
    const listener = (payload) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[realtime] Failed to handle "${event}"`, error);
      }
    };
    socket.on(event, listener);
    return [event, listener];
  });

  return () => listeners.forEach(([event, listener]) => socket.off(event, listener));
}
