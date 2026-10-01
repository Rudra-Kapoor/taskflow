import {
  addDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isSameYear,
  isToday,
  isYesterday,
  startOfDay,
} from 'date-fns';

const numberFormatter = new Intl.NumberFormat();

/** Parses an ISO string, timestamp or Date into a valid Date (or null). */
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `formatDate('2026-10-03T…')` -> "Oct 3, 2026". Returns '' for empty / invalid input. */
export function formatDate(iso, pattern = 'MMM d, yyyy') {
  const date = toDate(iso);
  return date ? format(date, pattern) : '';
}

/** "Oct 3, 2026 at 4:05 PM" */
export function formatDateTime(iso) {
  const date = toDate(iso);
  return date ? format(date, "MMM d, yyyy 'at' h:mm a") : '';
}

/** "Oct 3" for dates in the current year, "Oct 3, 2027" otherwise. */
export function formatShortDate(iso) {
  const date = toDate(iso);
  if (!date) return '';
  return format(date, isSameYear(date, new Date()) ? 'MMM d' : 'MMM d, yyyy');
}

/** Relative time: "just now", "5 minutes ago", "3 days ago", "in 2 hours". */
export function timeAgo(iso) {
  const date = toDate(iso);
  if (!date) return '';
  if (Math.abs(Date.now() - date.getTime()) < 60 * 1000) return 'just now';
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/** Day heading for grouped feeds: "Today", "Yesterday", "Monday, Sep 29". */
export function formatDayHeading(iso) {
  const date = toDate(iso);
  if (!date) return '';
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, isSameYear(date, new Date()) ? 'EEEE, MMM d' : 'EEEE, MMM d, yyyy');
}

/** Local calendar-day key ("2026-10-01"), handy for grouping. */
export function getDayKey(iso) {
  const date = toDate(iso);
  return date ? format(date, 'yyyy-MM-dd') : '';
}

/**
 * Describes a task due date for badges.
 * @returns {{ label: string, relative: string, title: string,
 *   tone: 'overdue'|'today'|'soon'|'normal'|'done'|'none' }}
 *   `label` is compact ("Oct 3", "Overdue · 2d"), `relative` spells it out ("Due in 2 days").
 *   `soon` = due within the next 2 days; `done` = task completed.
 */
export function getDueInfo(dueDate, status) {
  const due = toDate(dueDate);
  if (!due) {
    return { label: 'No due date', relative: 'No due date', tone: 'none', title: 'No due date' };
  }

  const now = new Date();
  const label = formatShortDate(due);
  const title = `Due ${format(due, 'EEEE, MMM d, yyyy')}`;

  if (status === 'completed') return { label, relative: 'Completed', tone: 'done', title };

  if (due.getTime() < now.getTime()) {
    const days = differenceInCalendarDays(now, due);
    return {
      label: days > 0 ? `Overdue · ${days}d` : 'Overdue',
      relative: days > 0 ? `Overdue by ${pluralize(days, 'day')}` : 'Overdue',
      tone: 'overdue',
      title,
    };
  }

  const daysLeft = differenceInCalendarDays(due, now);
  const relative = `Due in ${pluralize(daysLeft, 'day')}`;
  if (daysLeft === 0) return { label: 'Due today', relative: 'Due today', tone: 'today', title };
  if (daysLeft === 1) {
    return { label: 'Due tomorrow', relative: 'Due tomorrow', tone: 'soon', title };
  }
  return { label, relative, tone: daysLeft <= 2 ? 'soon' : 'normal', title };
}

/** ISO -> 'yyyy-MM-dd' in local time for <input type="date">, or '' when empty. */
export function toDateInputValue(iso) {
  const date = toDate(iso);
  return date ? format(date, 'yyyy-MM-dd') : '';
}

/**
 * 'yyyy-MM-dd' from <input type="date"> -> ISO string of the END of that local day
 * (23:59:59.999), so a task only becomes overdue once its due day has passed. '' -> null.
 */
export function fromDateInputValue(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "Aarav Sharma" -> "AS", "Priya" -> "P". */
export function getInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** "Aarav Sharma" -> "Aarav". */
export function getFirstName(name) {
  return (
    String(name ?? '')
      .trim()
      .split(/\s+/)[0] ?? ''
  );
}

/** Human task key, e.g. `WEB-12`. Uses `task.project.key` unless `projectKey` is given. */
export function getTaskKey(task, projectKey) {
  if (!task) return '';
  const key = projectKey || task.project?.key;
  if (task.number === undefined || task.number === null) return key ?? '';
  return key ? `${key}-${task.number}` : `#${task.number}`;
}

/** Formats a number with locale separators ("1,204"). */
export function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

/** Count shown in small badges (unread notifications): "3", or "9+" above `max`. */
export function formatBadgeCount(count, max = 9) {
  return count > max ? `${max}+` : formatNumber(count);
}

/**
 * Count + correctly pluralised noun.
 * @example pluralize(1, 'task') -> "1 task"; pluralize(3, 'task') -> "3 tasks";
 *          pluralize(2, 'person', 'people') -> "2 people"
 */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/**
 * Client-side equivalent of the API `due` filter (overdue | today | week | none | '').
 * "today" / "week" use the browser's local day boundaries.
 */
export function matchesDueFilter(task, due, now = new Date()) {
  if (!due) return true;
  const date = toDate(task?.dueDate);
  const dayStart = startOfDay(now);

  switch (due) {
    case 'overdue':
      return Boolean(date) && date < now && task.status !== 'completed';
    case 'today':
      return Boolean(date) && date >= dayStart && date < addDays(dayStart, 1);
    case 'week':
      return Boolean(date) && date >= dayStart && date < addDays(dayStart, 7);
    case 'none':
      return !date;
    default:
      return true;
  }
}

/** Small, stable string hash (djb2) used to pick deterministic colours. */
export function hashString(value) {
  const input = String(value ?? '');
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return Math.abs(hash >>> 0);
}

/** Picks a stable item from `palette` for the given string (labels, team tiles, …). */
export function pickFromPalette(value, palette) {
  return palette[hashString(value) % palette.length];
}
