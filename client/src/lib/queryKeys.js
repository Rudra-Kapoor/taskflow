/**
 * Query key factory: the single source of truth for cache keys. Keys are hierarchical, so a
 * prefix invalidates a whole family (e.g. `queryKeys.tasks.all` matches boards, searches and task
 * details). The plural helpers (`projects.lists()`, `tasks.boards()`, `tasks.searches()`,
 * `tasks.details()`, `users.searches()`) are the prefixes of their parameterised siblings.
 */
export const queryKeys = {
  me: ['auth', 'me'],
  teams: {
    all: ['teams'],
    list: () => ['teams', 'list'],
    detail: (id) => ['teams', 'detail', id],
  },
  projects: {
    all: ['projects'],
    lists: () => ['projects', 'list'],
    list: (filters) => ['projects', 'list', filters],
    detail: (id) => ['projects', 'detail', id],
  },
  tasks: {
    all: ['tasks'],
    boards: () => ['tasks', 'board'],
    board: (projectId) => ['tasks', 'board', projectId],
    searches: () => ['tasks', 'search'],
    search: (params) => ['tasks', 'search', params],
    details: () => ['tasks', 'detail'],
    detail: (id) => ['tasks', 'detail', id],
  },
  comments: (taskId) => ['comments', taskId],
  activity: {
    all: ['activity'],
    feed: () => ['activity', 'feed'],
    project: (id) => ['activity', 'project', id],
    task: (id) => ['activity', 'task', id],
  },
  notifications: {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', params],
  },
  dashboard: ['dashboard'],
  users: {
    searches: () => ['users', 'search'],
    search: (q, excludeTeam) => ['users', 'search', q, excludeTeam ?? null],
  },
};

/**
 * Mutation keys. Besides labelling mutations, they let real-time handlers recognise the socket
 * echo of the current user's own actions (e.g. not announcing "this task was deleted" to the
 * person who deleted it).
 */
export const mutationKeys = {
  auth: {
    updateProfile: ['auth', 'updateProfile'],
    changePassword: ['auth', 'changePassword'],
  },
  teams: {
    create: ['teams', 'create'],
    update: ['teams', 'update'],
    delete: ['teams', 'delete'],
    addMember: ['teams', 'addMember'],
    updateMemberRole: ['teams', 'updateMemberRole'],
    removeMember: (teamId) => ['teams', 'removeMember', teamId],
  },
  projects: {
    create: ['projects', 'create'],
    update: ['projects', 'update'],
    delete: ['projects', 'delete'],
  },
  tasks: {
    create: ['tasks', 'create'],
    update: ['tasks', 'update'],
    move: ['tasks', 'move'],
    delete: ['tasks', 'delete'],
  },
  comments: {
    add: ['comments', 'add'],
    update: ['comments', 'update'],
    delete: ['comments', 'delete'],
  },
  notifications: {
    all: ['notifications'],
    markRead: ['notifications', 'markRead'],
    markAllRead: ['notifications', 'markAllRead'],
    delete: ['notifications', 'delete'],
  },
};
