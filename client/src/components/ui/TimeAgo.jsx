import { useSyncExternalStore } from 'react';
import { formatDateTime, timeAgo, toDate } from '@/lib/format';

// One shared ticker re-renders every mounted <TimeAgo> so relative times stay fresh.
const TICK_MS = 30 * 1000;
const listeners = new Set();
let now = Date.now();
let timer = null;

function subscribe(listener) {
  listeners.add(listener);
  if (!timer) {
    timer = window.setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => now;

/** Self-updating relative time ("5 minutes ago") with the full date as a tooltip. */
export function TimeAgo({ date, className }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const value = toDate(date);
  if (!value) return null;

  return (
    <time dateTime={value.toISOString()} title={formatDateTime(value)} className={className}>
      {timeAgo(value)}
    </time>
  );
}
