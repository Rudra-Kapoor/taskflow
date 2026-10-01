import { ArrowDown, ArrowUp, CheckCircle2, Circle, Equal, Flame, Timer } from 'lucide-react';

export const APP_NAME = 'TaskFlow';

/**
 * Task statuses in board order.
 * `dot` / `text` are Tailwind classes, `badge` is a <Badge color>, `color` is a hex for charts.
 */
export const TASK_STATUSES = [
  {
    value: 'todo',
    label: 'To Do',
    icon: Circle,
    dot: 'bg-slate-400',
    badge: 'gray',
    text: 'text-slate-500 dark:text-slate-400',
    color: '#94a3b8',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    icon: Timer,
    dot: 'bg-blue-500',
    badge: 'blue',
    text: 'text-blue-600 dark:text-blue-400',
    color: '#3b82f6',
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'green',
    text: 'text-emerald-600 dark:text-emerald-400',
    color: '#10b981',
  },
];

export const STATUS_META = Object.fromEntries(
  TASK_STATUSES.map((status) => [status.value, status]),
);

/**
 * Task priorities from lowest to highest.
 * `tile` = soft background + text classes for icon-only chips.
 */
export const TASK_PRIORITIES = [
  {
    value: 'low',
    label: 'Low',
    icon: ArrowDown,
    badge: 'gray',
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    tile: 'bg-slate-100 text-slate-600 dark:bg-slate-400/10 dark:text-slate-300',
    color: '#94a3b8',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: Equal,
    badge: 'yellow',
    dot: 'bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    tile: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
    color: '#f59e0b',
  },
  {
    value: 'high',
    label: 'High',
    icon: ArrowUp,
    badge: 'orange',
    dot: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    tile: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
    color: '#f97316',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    icon: Flame,
    badge: 'red',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    tile: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    color: '#f43f5e',
  },
];

export const PRIORITY_META = Object.fromEntries(
  TASK_PRIORITIES.map((priority) => [priority.value, priority]),
);

/** Sort weight: lower = more important. */
export const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export const TEAM_ROLES = [
  {
    value: 'owner',
    label: 'Owner',
    badge: 'purple',
    description: 'Full control, including member roles and deleting the team',
  },
  {
    value: 'admin',
    label: 'Admin',
    badge: 'brand',
    description: 'Manages members, projects and team details',
  },
  {
    value: 'member',
    label: 'Member',
    badge: 'gray',
    description: 'Works on tasks and comments in team projects',
  },
];

export const ROLE_META = Object.fromEntries(TEAM_ROLES.map((role) => [role.value, role]));

/** Roles allowed to manage a team, its members and its projects. */
export const MANAGER_ROLES = ['owner', 'admin'];

/** Human names of the palette colours (accessible names of colour swatches). */
export const COLOR_NAMES = {
  '#6366f1': 'Indigo',
  '#8b5cf6': 'Violet',
  '#d946ef': 'Fuchsia',
  '#ec4899': 'Pink',
  '#f43f5e': 'Rose',
  '#f97316': 'Orange',
  '#f59e0b': 'Amber',
  '#eab308': 'Yellow',
  '#22c55e': 'Green',
  '#10b981': 'Emerald',
  '#14b8a6': 'Teal',
  '#06b6d4': 'Cyan',
  '#0ea5e9': 'Sky',
  '#3b82f6': 'Blue',
};

export const PROJECT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#0ea5e9',
];

/** Same palette the API assigns to new users. */
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

/** Quick due-date filters; values match the API `due` query parameter. */
export const DUE_FILTERS = [
  { value: '', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due in 7 days' },
  { value: 'none', label: 'No due date' },
];

/**
 * Presentation for the `tone` returned by `getDueInfo()` (format.js). Text colours keep at least
 * 4.5:1 contrast on every surface of both themes.
 */
export const DUE_TONES = {
  overdue: { text: 'text-rose-700 dark:text-rose-400', badge: 'red' },
  today: { text: 'text-amber-700 dark:text-amber-300', badge: 'yellow' },
  soon: { text: 'text-orange-700 dark:text-orange-300', badge: 'orange' },
  normal: { text: 'text-fg-muted', badge: 'gray' },
  done: { text: 'text-emerald-700 dark:text-emerald-400', badge: 'green' },
  none: { text: 'text-fg-subtle', badge: 'gray' },
};

/** Values match the API `sort` query parameter of `GET /tasks`. */
export const TASK_SORT_OPTIONS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'due_asc', label: 'Due date (soonest)' },
  { value: 'due_desc', label: 'Due date (latest)' },
  { value: 'priority', label: 'Priority' },
];

/** Mirrors the API password policy (8-72 chars, at least one letter and one number). */
export const PASSWORD_REQUIREMENTS = [
  {
    id: 'length',
    label: '8 to 72 characters',
    test: (value) => value.length >= 8 && value.length <= 72,
  },
  { id: 'letter', label: 'At least one letter', test: (value) => /[A-Za-z]/.test(value) },
  { id: 'number', label: 'At least one number', test: (value) => /\d/.test(value) },
];

export const DEMO_CREDENTIALS = { email: 'demo@example.com', password: 'Demo@1234' };

/** The seeded teammates (same password as the demo account), e.g. to try live collaboration. */
export const DEMO_TEAMMATES = [
  {
    name: 'Priya Patel',
    email: 'priya@example.com',
    avatarColor: '#f43f5e',
    hint: 'Admin of Product Engineering',
  },
  {
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    avatarColor: '#3b82f6',
    hint: 'Member of Product Engineering',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul@example.com',
    avatarColor: '#eab308',
    hint: 'Owner of Growth & Marketing',
  },
  {
    name: 'Sneha Iyer',
    email: 'sneha@example.com',
    avatarColor: '#22c55e',
    hint: 'Admin of Growth & Marketing',
  },
  {
    name: 'Karan Mehta',
    email: 'karan@example.com',
    avatarColor: '#06b6d4',
    hint: 'Member of Product Engineering',
  },
];
