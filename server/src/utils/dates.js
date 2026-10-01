const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;

/**
 * Returns the [start, end) UTC instants of "today" for a client in the given
 * timezone. `tzOffset` uses the same convention as JS `Date#getTimezoneOffset()`
 * (e.g. IST = -330), so the browser can send it as-is.
 */
export function getDayRange(tzOffset = 0, now = new Date()) {
  const offsetMs = tzOffset * MINUTE;
  const localWallClock = new Date(now.getTime() - offsetMs);
  localWallClock.setUTCHours(0, 0, 0, 0);
  const start = new Date(localWallClock.getTime() + offsetMs);
  return { start, end: new Date(start.getTime() + DAY) };
}

/** Builds a Mongo filter fragment for the `due` quick filters used across the app. */
export function buildDueFilter(due, tzOffset = 0, now = new Date()) {
  const { start, end } = getDayRange(tzOffset, now);
  switch (due) {
    case 'overdue':
      return { dueDate: { $lt: now }, status: { $ne: 'completed' } };
    case 'today':
      return { dueDate: { $gte: start, $lt: end } };
    case 'week':
      return { dueDate: { $gte: start, $lt: new Date(start.getTime() + 7 * DAY) } };
    case 'none':
      return { dueDate: null };
    default:
      return {};
  }
}
