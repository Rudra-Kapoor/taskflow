import { Calendar, CalendarCheck2, CalendarClock, CalendarX2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getDueInfo } from '@/lib/format';

const TONES = {
  overdue: {
    icon: CalendarX2,
    className:
      'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  },
  today: {
    icon: CalendarClock,
    className:
      'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
  },
  soon: {
    icon: CalendarClock,
    className:
      'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
  },
  done: {
    icon: CalendarCheck2,
    className:
      'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  },
  normal: {
    icon: Calendar,
    className: 'bg-surface text-fg-muted ring-line dark:bg-transparent',
  },
};

/** Due date pill coloured by urgency (overdue, today, soon, done, normal); nothing without a date. */
export function DueChip({ dueDate, status, className }) {
  const due = getDueInfo(dueDate, status);
  if (due.tone === 'none') return null;
  const tone = TONES[due.tone] ?? TONES.normal;
  const Icon = tone.icon;

  return (
    <span
      title={due.title}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5',
        'text-[11px] font-medium ring-1 ring-inset',
        tone.className,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="sr-only">{due.title}: </span>
      {due.label}
    </span>
  );
}
