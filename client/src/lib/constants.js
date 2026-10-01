import {
  Circle,
  CircleCheck,
  Contrast,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SquareExclamationPoint,
} from 'lucide-react';

export const APP_NAME = 'TaskFlow';

/**
 * Task statuses in board order.
 * `dot` / `text` are Tailwind classes (dot = small marker, text = text-safe icon / label colour),
 * `badge` is a <Badge color>, `color` is a hex for charts.
 */
export const TASK_STATUSES = [
  {
    value: 'todo',
    label: 'To Do',
    icon: Circle,
    dot: 'bg-status-todo',
    badge: 'gray',
    text: 'text-fg-muted',
    color: '#8A857A',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    icon: Contrast,
    dot: 'bg-status-progress',
    badge: 'blue',
    text: 'text-info',
    color: '#2F6FEB',
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: CircleCheck,
    dot: 'bg-status-done',
    badge: 'green',
    text: 'text-success',
    color: '#2F8F5B',
  },
];

export const STATUS_META = Object.fromEntries(
  TASK_STATUSES.map((status) => [status.value, status]),
);

/**
 * Task priorities from lowest to highest.
 * `tile` = classes for the icon-only glyph (no tinted box: just the coloured mark).
 */
export const TASK_PRIORITIES = [
  {
    value: 'low',
    label: 'Low',
    icon: SignalLow,
    badge: 'gray',
    dot: 'bg-priority-low',
    text: 'text-fg-muted',
    tile: 'text-fg-subtle',
    color: '#8A857A',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: SignalMedium,
    badge: 'yellow',
    dot: 'bg-priority-medium',
    text: 'text-warning',
    tile: 'text-warning',
    color: '#C9A227',
  },
  {
    value: 'high',
    label: 'High',
    icon: SignalHigh,
    badge: 'orange',
    dot: 'bg-priority-high',
    text: 'text-caution',
    tile: 'text-caution',
    color: '#E8803A',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    icon: SquareExclamationPoint,
    badge: 'red',
    dot: 'bg-priority-urgent',
    text: 'text-danger',
    tile: 'text-danger',
    color: '#E5484D',
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

/**
 * Calmer display tones for the vivid stored palette (user avatars, optionally project / team
 * marks): same hue family, deeper and less saturated, white text >= 4.5:1. Stored values are
 * untouched; use `calmColor()` when painting.
 */
export const CALM_COLORS = {
  '#6366f1': '#4F5B93',
  '#8b5cf6': '#6B5A8E',
  '#d946ef': '#8E4F86',
  '#ec4899': '#A04E6F',
  '#f43f5e': '#B4453F',
  '#f97316': '#B05A2A',
  '#f59e0b': '#8F6A12',
  '#eab308': '#8A6D14',
  '#22c55e': '#3F7A55',
  '#10b981': '#2E7A62',
  '#14b8a6': '#2F7471',
  '#06b6d4': '#2F6F86',
  '#0ea5e9': '#336C99',
  '#3b82f6': '#3D64A8',
};

/** Display tone of a stored palette colour (unknown colours are returned unchanged). */
export function calmColor(hex) {
  if (typeof hex !== 'string') return hex;
  return CALM_COLORS[hex.toLowerCase()] ?? hex;
}

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
  overdue: { text: 'text-danger', badge: 'red' },
  today: { text: 'text-warning', badge: 'yellow' },
  soon: { text: 'text-caution', badge: 'orange' },
  normal: { text: 'text-fg-muted', badge: 'gray' },
  done: { text: 'text-success', badge: 'green' },
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
