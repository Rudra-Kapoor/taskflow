import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getDueInfo } from '@/lib/format';

/**
 * Only an overdue task or one due today gets colour; every other date stays quiet ink-muted.
 * Text colours keep at least 4.5:1 contrast on cards and table rows in both themes.
 */
const TONE_CLASSES = {
  overdue: 'text-rose-700 dark:text-rose-400',
  today: 'text-amber-700 dark:text-amber-300',
};

/** Due date in mono with a small calendar mark; nothing without a date. */
export function DueChip({ dueDate, status, className }) {
  const due = getDueInfo(dueDate, status);
  if (due.tone === 'none') return null;
  const tone = TONE_CLASSES[due.tone];

  return (
    <span
      title={due.title}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[11px] tabular-nums',
        tone ? cn('font-medium', tone) : 'text-fg-muted',
        className,
      )}
    >
      <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only">{due.title}: </span>
      {due.label}
    </span>
  );
}
