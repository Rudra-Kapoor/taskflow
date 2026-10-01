# TaskFlow Frontend Architecture

React 18 + Vite 6 + Tailwind CSS 3 + TanStack Query 5 + React Router 6 + Socket.IO client.
Plain JavaScript (ES modules, `.jsx` for components). Path alias `@` -> `client/src`.

This document describes how the client is organised and the conventions every module follows.

## Folder structure

```
client/
  index.html                 Inter font, theme bootstrap script (/theme-init.js), #root
  public/theme-init.js       sets `dark` class on <html> before paint (localStorage 'taskflow-theme')
  public/favicon.svg
  vite.config.js             react plugin, '@' alias, dev proxy /api + /socket.io (ws) -> http://localhost:5000
  tailwind.config.js         darkMode: 'class', semantic colour tokens (below), animations
  src/
    main.jsx                 <BrowserRouter><ThemeProvider><AppProviders><App/></AppProviders></ThemeProvider></BrowserRouter>
    App.jsx                  routes (lazy-loaded pages) + <Toaster/>
    index.css                Tailwind layers, CSS variables for tokens, scrollbar + base styles
    api/                     axios instance + one module per resource (pure functions, no React)
    lib/                     queryClient, queryKeys, cache helpers, constants, formatters, cn
    context/                 AuthContext, SocketContext, ThemeContext
    providers/AppProviders.jsx
    hooks/                   useDebounce, useMediaQuery, useLocalStorage, queries/* (TanStack hooks)
    components/
      ui/                    design-system primitives (no data fetching)
      layout/                AppLayout, Sidebar, Topbar, NotificationBell, UserMenu
      activity/              ActivityItem, ActivityFeed
      notifications/         NotificationItem
      board/                 Board, BoardColumn, TaskCard, BoardFilters, ListView, PresenceAvatars, ActivityPanel
      tasks/                 TaskDetailModal, TaskFormModal, CommentSection, AssigneeSelect, LabelsInput, ...
      projects/              ProjectFormModal, ProjectCard, ...
      teams/                 TeamFormModal, AddMemberModal, MemberRow, ...
      dashboard/             StatCard, StatusChart, UpcomingTasks, ...
    pages/                   one file per route
    routes/                  ProtectedRoute, PublicOnlyRoute
```

## Design system

Visual direction: clean, modern SaaS (Linear / Jira / Height). Airy layout, crisp 1px borders,
soft shadows, rounded corners, Inter font, indigo brand accent, full dark mode, smooth 150-200 ms
transitions, skeleton loaders and friendly empty states everywhere.

### Semantic colour tokens (CSS variables -> Tailwind colours)

Always prefer these tokens over raw greys so light/dark mode works without `dark:` variants.

| Tailwind class | Use | Light | Dark |
| --- | --- | --- | --- |
| `bg-canvas` | app background | `#f6f7fb` | `#0b0e16` |
| `bg-surface` | cards, sidebar, modals, inputs | `#ffffff` | `#121725` |
| `bg-surface-muted` | board columns, table headers, subtle panels | `#f1f3f8` | `#171d2c` |
| `bg-surface-hover` | hover state for rows / menu items | `#eef0f6` | `#1d2435` |
| `border-line` | default borders / dividers | `#e3e6ef` | `#242c3f` |
| `border-line-strong` | input borders, emphasized dividers | `#cfd4e1` | `#323b52` |
| `text-fg` | primary text | `#0f172a` | `#e6e9f2` |
| `text-fg-muted` | secondary text | `#5b647a` | `#9aa3b8` |
| `text-fg-subtle` | placeholders, meta | `#8b93a7` | `#6b7489` |
| `brand-50 ... brand-950` | accent (Tailwind indigo scale) | | |

Tokens also work with `ring-*`, `divide-*`, `from-*`, etc. (`border-line`, `divide-line`, `ring-line`).

Status colours: To Do = slate, In Progress = blue, Completed = emerald.
Priority colours: Low = slate (`ArrowDown`), Medium = amber (`Equal`), High = orange (`ArrowUp`),
Urgent = rose (`Flame`). Icons come from `lucide-react`.

Utility classes defined in `index.css` (`@layer components`): `.card` (surface + border + rounded-xl
+ shadow-sm), `.input-base`, `.focus-ring`, `.scrollbar-thin`, `.text-gradient`.

### UI primitives (`src/components/ui`)

Each primitive is its own file with a named export, plus a barrel `src/components/ui/index.js`.

| Component | Props |
| --- | --- |
| `Button` | `variant` = `primary` \| `secondary` \| `ghost` \| `danger` \| `outline` (default primary), `size` = `xs` \| `sm` \| `md` \| `lg` (default md), `icon` (lucide component, left), `iconRight`, `loading`, `fullWidth`, `as` (e.g. `Link`), all native props. forwardRef. |
| `IconButton` | `icon` (lucide component, required), `label` (aria-label + title, required), `variant` = `ghost` \| `secondary` \| `danger`, `size` = `xs` \| `sm` \| `md`, native props. forwardRef. |
| `Input` | forwardRef; `error` (string), `icon` (lucide component shown left), native props. Works with `register()`. |
| `Textarea` | forwardRef; `error`, `rows`, native props. |
| `Select` | forwardRef native `<select>` with chevron; `error`, children `<option>`s. |
| `FormField` | `label`, `htmlFor`, `error`, `hint`, `required`, `children`. Renders label, control, error text (red) or hint. |
| `Modal` | `open`, `onClose`, `title`, `description`, `size` = `sm` \| `md` \| `lg` \| `xl` \| `2xl` (default md), `footer` (node, right-aligned actions), `dismissible` (default true), `children`, `className`. Portal to body, overlay blur, ESC/overlay click close, body scroll lock, enter animation, full-height sheet on mobile. |
| `ConfirmDialog` | `open`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel` (default "Delete"), `variant` (default `danger`), `loading`. |
| `DropdownMenu` | `trigger` (element; cloned with onClick), `align` = `start` \| `end`, `width` (tailwind class, default `w-56`), `children`. Closes on outside click / ESC / item click. |
| `DropdownItem` | `icon`, `onClick`, `danger`, `disabled`, `children`, `as`/`to` for links. |
| `DropdownSeparator`, `DropdownLabel` | - |
| `Avatar` | `user` ({ name, avatarColor } or null -> dashed "unassigned" circle), `size` = `xs`(20) \| `sm`(24) \| `md`(32) \| `lg`(40) \| `xl`(56), `showTooltip` (title attr), `online` (green dot), `className`. Initials on avatarColor background. |
| `AvatarGroup` | `users`, `max` (default 4), `size`. Overlapping with ring, `+N` bubble. |
| `Badge` | `color` = `gray` \| `brand` \| `blue` \| `green` \| `yellow` \| `orange` \| `red` \| `purple`, `size` = `sm` \| `md`, `dot`, `children`. |
| `StatusBadge` | `status`. |
| `PriorityBadge` | `priority`, `showLabel` (default true), `size`. |
| `LabelChip` | `label`, `onRemove?`. Deterministic colour from label hash. |
| `Spinner` | `size` = `sm` \| `md` \| `lg`, `className`. |
| `Skeleton` | `className` (shimmer block). |
| `PageLoader` | full-area centred spinner. |
| `EmptyState` | `icon`, `title`, `description`, `action` (node), `compact`. |
| `ErrorState` | `title` (default "Something went wrong"), `error` (uses `getErrorMessage`), `onRetry`. |
| `Card` | `className`, `children`, `padding` (default true). |
| `PageHeader` | `title`, `description`, `actions` (node), `icon`, `children` (extra row). |
| `SearchInput` | `value`, `onChange(string)`, `placeholder`, `className`, `autoFocus`, `inputRef`. Search icon + clear button. |
| `SegmentedControl` | `options` [{ value, label, icon? }], `value`, `onChange(value)`, `size`. |
| `Tabs` | `tabs` [{ value, label, count? }], `value`, `onChange(value)` - underline style. |
| `Tooltip` | `content`, `children`, `side` = `top` \| `bottom`. CSS-only. |
| `ProgressBar` | `value` (0-100), `className`, `color` (hex or tailwind class). |
| `Kbd` | children. |
| `ColorPicker` | `value`, `onChange(hex)`, `colors` (defaults to `PROJECT_COLORS`). |

### Shared helpers (`src/lib`)

- `cn(...inputs)` - clsx wrapper.
- `constants.js`
  - `TASK_STATUSES` = `[{ value: 'todo', label: 'To Do', icon: Circle, dot: 'bg-slate-400', badge: 'gray' }, { value: 'in_progress', label: 'In Progress', icon: Timer, dot: 'bg-blue-500', badge: 'blue' }, { value: 'completed', label: 'Completed', icon: CheckCircle2, dot: 'bg-emerald-500', badge: 'green' }]`, `STATUS_META` (map by value)
  - `TASK_PRIORITIES` = `[{ value: 'low', label: 'Low', icon: ArrowDown, ... }, medium, high, urgent]`, `PRIORITY_META`, `PRIORITY_ORDER` ({ urgent: 0, high: 1, medium: 2, low: 3 })
  - `TEAM_ROLES` = `[{ value: 'owner', label: 'Owner' }, admin, member]`, `ROLE_META`
  - `PROJECT_COLORS` (10 hex colours), `AVATAR_COLORS` (10 hex colours)
  - `DUE_FILTERS` = `[{ value: '', label: 'Any due date' }, { value: 'overdue', label: 'Overdue' }, { value: 'today', label: 'Due today' }, { value: 'week', label: 'Due in 7 days' }, { value: 'none', label: 'No due date' }]`
  - `DEMO_CREDENTIALS` = `{ email: 'demo@example.com', password: 'Demo@1234' }`
- `format.js`
  - `formatDate(iso, pattern = 'MMM d, yyyy')`, `formatDateTime(iso)`, `timeAgo(iso)` ("5 minutes ago")
  - `getDueInfo(dueDate, status)` -> `{ label, tone }` where tone is `overdue` \| `today` \| `soon` (<= 2 days) \| `normal` \| `done` \| `none`; label e.g. "Overdue · 2d", "Due today", "Due tomorrow", "Oct 3".
  - `toDateInputValue(iso)` -> `'yyyy-MM-dd'` (local) or `''`
  - `fromDateInputValue(value)` -> ISO string of **end of that local day** or `null`
  - `getInitials(name)`, `getTaskKey(task, projectKey?)` (`WEB-12`), `pluralize(count, singular, plural?)`
  - `matchesDueFilter(task, due)` - same semantics as the API `due` filter, for client-side board filtering.
- `activity.js` - `describeActivity(activity)` -> `{ verb: string, target: string | null, detail: string | null }` used by `ActivityItem` for every action listed in API.md.

### Shared feature components

- `ActivityItem({ activity, showProject = false })` - avatar, sentence ("**Priya** moved **WEB-12 Fix login** from To Do to In Progress"), relative time. Task targets link to `?task=<id>` (keep current path).
- `ActivityFeed({ query, emptyTitle, showProject, compact })` - takes the result of an infinite activity hook, renders skeletons / empty state / items grouped by day / "Load more" button.
- `NotificationItem({ notification, onClick, compact })` - actor avatar, message, project chip, time, unread dot.
- `NotificationBell` (in layout) - bell button with unread count badge, dropdown panel with latest 8, "Mark all read", "View all" -> `/notifications`. Clicking an item marks it read and navigates to its link.

### Layout

`AppLayout` = fixed `Sidebar` (260px, collapsible to drawer under `lg`) + sticky `Topbar` + scrollable
`<main>` with `<Outlet/>`. When the URL has `?task=<id>` (any page), AppLayout renders
`<TaskDetailModal taskId={id} onClose={() => remove 'task' param} />` - so any page can open a task by
setting that search param, and notifications can deep-link to `/projects/:projectId?task=:taskId`.

Sidebar: logo, nav (Dashboard `/`, My Tasks `/tasks`, Projects `/projects`, Teams `/teams`,
Notifications `/notifications` with unread count), "Projects" section listing active projects
(colour dot + name, link to board, "+" opens `ProjectFormModal`), "Teams" section, user card at the
bottom. Topbar: mobile menu button, global search (submitting navigates to `/tasks?search=...`;
`Ctrl/Cmd+K` focuses it), "New task" button (opens `TaskFormModal` without projectId), connection
indicator (live/offline dot from `useSocket().isConnected`), theme toggle, `NotificationBell`, `UserMenu`
(profile, theme, logout).

## Routing (`App.jsx`)

| Path | Page | Access |
| --- | --- | --- |
| `/login`, `/register` | LoginPage, RegisterPage | public only (redirect to `/` when logged in) |
| `/` | DashboardPage | protected |
| `/tasks` | MyTasksPage | protected |
| `/projects` | ProjectsPage | protected |
| `/projects/:projectId` | ProjectBoardPage | protected |
| `/teams` | TeamsPage | protected |
| `/teams/:teamId` | TeamDetailPage | protected |
| `/notifications` | NotificationsPage | protected |
| `/profile` | ProfilePage | protected |
| `*` | NotFoundPage | - |

Pages are lazy-loaded (`React.lazy`) inside `<Suspense fallback={<PageLoader/>}>`. Protected routes
redirect to `/login?redirect=<path>` and wait for auth bootstrap (`isLoading`) before deciding.

## Shared modals

| Component | File | Props |
| --- | --- | --- |
| `TaskDetailModal` | `components/tasks/TaskDetailModal.jsx` | `taskId`, `onClose` |
| `TaskFormModal` | `components/tasks/TaskFormModal.jsx` | `open`, `onClose`, `projectId?` (shows project picker when absent), `defaultStatus?`, `onCreated?(task)` |
| `ProjectFormModal` | `components/projects/ProjectFormModal.jsx` | `open`, `onClose`, `project?` (edit mode when given), `defaultTeamId?`, `onSaved?(project)` |
| `TeamFormModal` | `components/teams/TeamFormModal.jsx` | `open`, `onClose`, `team?` (edit mode), `onSaved?(team)` |

All modals are default-free **named exports**.

## Data layer

### API client (`src/api/client.js`)

- `api` - axios instance, `baseURL = import.meta.env.VITE_API_URL || '/api'`, adds
  `Authorization: Bearer <token>` from `tokenStorage`, `timeout: 15000`.
- On a `401` from any request except `/auth/login` & `/auth/register`: clear token, emit
  `window.dispatchEvent(new Event('auth:logout'))` (AuthContext listens and resets state).
- `tokenStorage` = `{ get(), set(token), clear() }` (localStorage key `taskflow_token`).
- `getErrorMessage(error, fallback = 'Something went wrong')` - server `message`, network error text, etc.
- `getFieldErrors(error)` -> `{ [field]: message }` from the server `errors` array.
- `applyFieldErrors(error, setError)` - pushes server field errors into react-hook-form; returns true if any.
- `unwrap(response)` -> `response.data.data`; `unwrapPage(response)` -> `{ items: data, meta }`.

Resource modules (all functions are async and return unwrapped data):

| Module | Functions |
| --- | --- |
| `api/auth.js` | `login({ email, password })` -> `{ user, token }`, `register({ name, email, password })`, `getMe()` -> user, `updateProfile(data)` -> user, `changePassword({ currentPassword, newPassword })` |
| `api/users.js` | `searchUsers({ q, excludeTeam })` -> `UserPublic[]` |
| `api/teams.js` | `getTeams()`, `getTeam(id)`, `createTeam(data)`, `updateTeam(id, data)`, `deleteTeam(id)`, `addMember(teamId, { email, role })`, `updateMemberRole(teamId, userId, role)`, `removeMember(teamId, userId)` |
| `api/projects.js` | `getProjects(params)`, `getProject(id)`, `createProject(data)`, `updateProject(id, data)`, `deleteProject(id)`, `getProjectTasks(id)`, `getProjectActivity(id, { before, limit })` -> `{ items, meta }` |
| `api/tasks.js` | `searchTasks(params)` -> `{ items, meta }`, `getTask(id)`, `createTask(projectId, data)`, `updateTask(id, data)`, `moveTask(id, { status, prevTaskId, nextTaskId })` -> `{ task, reordered }`, `deleteTask(id)`, `getTaskActivity(id, { before, limit })` -> `{ items, meta }` |
| `api/comments.js` | `getComments(taskId)`, `addComment(taskId, body)`, `updateComment(commentId, body)`, `deleteComment(commentId)` |
| `api/notifications.js` | `getNotifications(params)` -> `{ items, meta }`, `markNotificationRead(id)`, `markAllNotificationsRead()`, `deleteNotification(id)` |
| `api/activity.js` | `getActivityFeed({ before, limit })` -> `{ items, meta }` |
| `api/dashboard.js` | `getDashboard()` (sends `tzOffset` automatically) |

### Query keys (`src/lib/queryKeys.js`)

```js
export const queryKeys = {
  me: ['auth', 'me'],
  teams: { all: ['teams'], list: () => ['teams', 'list'], detail: (id) => ['teams', 'detail', id] },
  projects: { all: ['projects'], list: (filters) => ['projects', 'list', filters], detail: (id) => ['projects', 'detail', id] },
  tasks: {
    all: ['tasks'],
    board: (projectId) => ['tasks', 'board', projectId],
    search: (params) => ['tasks', 'search', params],
    detail: (id) => ['tasks', 'detail', id],
  },
  comments: (taskId) => ['comments', taskId],
  activity: {
    all: ['activity'],
    feed: () => ['activity', 'feed'],
    project: (id) => ['activity', 'project', id],
    task: (id) => ['activity', 'task', id],
  },
  notifications: { all: ['notifications'], list: (params) => ['notifications', 'list', params] },
  dashboard: ['dashboard'],
  users: { search: (q, excludeTeam) => ['users', 'search', q, excludeTeam ?? null] },
};
```

### Hooks (`src/hooks/queries/*.js`)

All mutations show no toast themselves (pages decide), keep caches in sync, and throw the axios error.

| File | Hooks (data shape) |
| --- | --- |
| `auth.js` | `useUpdateProfile()`, `useChangePassword()` |
| `users.js` | `useUserSearch(q, { excludeTeam } = {})` -> `UserPublic[]` (enabled when `q.trim().length >= 2`) |
| `teams.js` | `useTeams()` -> `Team[]`, `useTeam(teamId)` -> `Team`, `useCreateTeam()`, `useUpdateTeam(teamId)`, `useDeleteTeam()`, `useAddMember(teamId)` (vars `{ email, role }`), `useUpdateMemberRole(teamId)` (vars `{ userId, role }`), `useRemoveMember(teamId)` (vars `userId`) |
| `projects.js` | `useProjects(filters = { status: 'active' })` -> `Project[]`, `useProject(projectId)` -> `Project`, `useCreateProject()`, `useUpdateProject(projectId)`, `useDeleteProject()` (vars `projectId`) |
| `tasks.js` | `useProjectTasks(projectId)` -> `Task[]`, `useTask(taskId)` -> `Task`, `useSearchTasks(params)` -> `{ items, meta }` (keeps previous data while paging), `useCreateTask()` (vars `{ projectId, data }`), `useUpdateTask()` (vars `{ taskId, data }`, optimistic), `useMoveTask(projectId)` (vars `{ taskId, status, prevTaskId, nextTaskId }`, optimistic: updates status + computes position locally, rolls back on error), `useDeleteTask()` (vars `{ taskId, projectId }`) |
| `comments.js` | `useComments(taskId)` -> `Comment[]`, `useAddComment(taskId)` (vars `body`), `useUpdateComment(taskId)` (vars `{ commentId, body }`), `useDeleteComment(taskId)` (vars `commentId`) |
| `activity.js` | `useActivityFeed({ limit = 20 } = {})`, `useProjectActivity(projectId)`, `useTaskActivity(taskId)` - `useInfiniteQuery`, each page `{ items, meta }`; helper `flattenPages(data)` exported from `lib/cache.js` |
| `notifications.js` | `useNotifications({ unread, page, limit } = {})` -> `{ items, meta }` (meta.unreadCount), `useUnreadCount()` -> number, `useMarkNotificationRead()`, `useMarkAllNotificationsRead()`, `useDeleteNotification()` |
| `dashboard.js` | `useDashboard()` |

### Contexts

- `AuthContext` - `AuthProvider`, `useAuth()` -> `{ user, token, isAuthenticated, isLoading, login(credentials) -> user, register(data) -> user, logout(), setUser(user) }`. Bootstraps by calling `getMe()` when a token exists. `logout()` clears the token and the whole query cache.
- `SocketContext` - `SocketProvider` (connects when authenticated, disconnects on logout, registers realtime cache handlers from `src/realtime/handlers.js`), `useSocket()` -> `{ socket, isConnected }`, `useProjectRoom(projectId)` -> `{ viewers: UserPublic[] }` (ref-counted `project:join`/`project:leave`, re-joins on reconnect, live presence). On reconnect it invalidates all queries to recover missed events.
- `ThemeContext` - `ThemeProvider`, `useTheme()` -> `{ theme: 'light' | 'dark', toggleTheme(), setTheme() }`.
- `AppProviders` - `QueryClientProvider` > `AuthProvider` > `SocketProvider`.

### Real-time cache sync (`src/realtime/handlers.js`)

| Event | Cache effect |
| --- | --- |
| `task:created` / `task:updated` | upsert into `tasks.board(projectId)` (skip if cached `updatedAt` is newer), update `tasks.detail(id)` if cached, invalidate `tasks.search`, `dashboard`, `projects.all` (task counts) |
| `task:deleted` | remove from board, remove `tasks.detail(id)`, invalidate search/dashboard/projects |
| `tasks:reordered` | patch positions in board |
| `tasks:refresh` | invalidate `tasks.board(projectId)` |
| `comment:created/updated/deleted` | upsert/remove in `comments(taskId)`, set `commentCount` on board + detail task |
| `activity:created` | prepend to first page of `activity.feed`, `activity.project(project)`, `activity.task(task)` if cached (dedupe by `_id`) |
| `project:created/updated/deleted` | invalidate `projects.all`; merge into `projects.detail(id)` keeping its full `team` |
| `team:updated` / `team:added` | invalidate `teams.all`, `projects.all` |
| `team:deleted` / `team:removed` | invalidate teams + projects, toast "You were removed from <team>" for `team:removed` |
| `notification:created` | invalidate `notifications.all`, show a clickable toast (actor + message) that navigates to the task |
| `presence:update` | stored in SocketContext state, read through `useProjectRoom` |
| `notification:read` / `notifications:read_all` / `notification:deleted` | patch every cached notification list + unread count (cross-tab / cross-device sync) |
| `notifications:refresh` | invalidate notifications (after project / team cascade deletes) |
| `user:updated` | patch the user in every cached copy (members, assignees, comments, presence, own profile) |

Other data-layer rules: queries retry once (800 ms) on 5xx / network errors and never on 4xx; the socket's
reconnect handler resyncs the cache (so `refetchOnReconnect` is off); a password change resolves with a new
token that `useAuth().replaceToken()` stores without clearing the session, and other tabs pick it up through
the `storage` event.

Shared URL helpers: `lib/taskLinks.js` (`withTaskParam`, `taskBoardPath`, `openTaskModal`, `closeTaskModal`;
opening a task pushes a history entry and closing goes back to it), `hooks/useTaskModal.js` (stable
`openTask` / `closeTask`), `lib/searchParams.js` (`updateSearchParams` always starts from the live URL so
rapid filter changes never overwrite each other) and `lib/ids.js` (`getId`, `isObjectId`).

Shared cache helpers in `src/lib/cache.js`: `flattenPages`, `upsertTaskInCaches(queryClient, task)`,
`removeTaskFromCaches(queryClient, taskId, projectId)`, `patchTaskPositions(queryClient, projectId, positions)`,
`setTaskCommentCount(queryClient, taskId, projectId, count)`, `prependToInfinite(queryClient, key, item)`,
`computeLocalPosition(columnTasks, prevTaskId, nextTaskId)`, `sortByPosition(tasks)`.
