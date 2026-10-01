export const TASK_STATUSES = ['todo', 'in_progress', 'completed'];

export const TASK_STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const TEAM_ROLES = ['owner', 'admin', 'member'];

/** Roles allowed to manage a team, its members and its projects. */
export const TEAM_MANAGER_ROLES = ['owner', 'admin'];

export const PROJECT_STATUSES = ['active', 'archived'];

/** Quick due-date filters shared by task search (see utils/dates.js#buildDueFilter). */
export const DUE_FILTERS = ['overdue', 'today', 'week', 'none'];

/** Sort orders supported by `GET /tasks`. */
export const TASK_SORTS = ['updated', 'newest', 'oldest', 'due_asc', 'due_desc', 'priority'];

/** Gap between task positions inside a board column (fractional ordering). */
export const POSITION_GAP = 1024;

/** Public user fields that are safe to expose to other team members. */
export const USER_PUBLIC_FIELDS = 'name email avatarColor title';

export const AVATAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];

export const ACTIVITY = Object.freeze({
  TEAM_CREATED: 'team.created',
  TEAM_UPDATED: 'team.updated',
  MEMBER_ADDED: 'team.member_added',
  MEMBER_REMOVED: 'team.member_removed',
  MEMBER_ROLE_CHANGED: 'team.member_role_changed',
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_DELETED: 'task.deleted',
  COMMENT_ADDED: 'comment.added',
});

export const NOTIFICATION = Object.freeze({
  TASK_ASSIGNED: 'task_assigned',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_COMMENTED: 'task_commented',
  TASK_DUE_SOON: 'task_due_soon',
  TEAM_MEMBER_ADDED: 'team_member_added',
});
