/** Events the browser sends to the server. */
export const CLIENT_EVENTS = Object.freeze({
  PROJECT_JOIN: 'project:join',
  PROJECT_LEAVE: 'project:leave',
});

/** Events the server pushes to clients (see docs/API.md "Real-time"). */
export const SERVER_EVENTS = Object.freeze({
  PRESENCE_UPDATE: 'presence:update',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASKS_REORDERED: 'tasks:reordered',
  TASKS_REFRESH: 'tasks:refresh',
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
  ACTIVITY_CREATED: 'activity:created',
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETED: 'project:deleted',
  TEAM_UPDATED: 'team:updated',
  TEAM_DELETED: 'team:deleted',
  TEAM_ADDED: 'team:added',
  TEAM_REMOVED: 'team:removed',
  NOTIFICATION_CREATED: 'notification:created',
  // Keep the recipient's other tabs / devices in sync with reads and deletions.
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATIONS_READ_ALL: 'notifications:read_all',
  NOTIFICATION_DELETED: 'notification:deleted',
  // Many notifications vanished at once (a project or team was deleted): refetch the list.
  NOTIFICATIONS_REFRESH: 'notifications:refresh',
  // A user edited their profile; sent to their teammates and their own other tabs.
  USER_UPDATED: 'user:updated',
});
