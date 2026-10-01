import { cn } from '@/lib/cn';
import { getDueInfo } from '@/lib/format';

/**
 * Only an overdue task or one due today gets colour; every other date stays quiet ink-muted.
 * The text-safe tones keep at least 4.5:1 contrast on every surface of both themes.
 */
const TONE_CLASSES = {
  overdue: 'font-medium text-danger',
  today: 'font-medium text-warning',
};

/**
 * Due date in mono figures: "Overdue · 2d", "Due today", "Due tomorrow", "Oct 3"… A missing
 * date shows a quiet dash (read out as "No due date") unless `showEmpty` is off.
 */
export function DueLabel({ dueDate, status, showEmpty = true, className }) {
  const { label, tone, title } = getDueInfo(dueDate, status);
  if (tone === 'none' && !showEmpty) return null;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center whitespace-nowrap font-mono text-xs tabular-nums',
        TONE_CLASSES[tone] ?? 'text-fg-muted',
        className,
      )}
    >
      {tone === 'none' ? (
        <>
          <span aria-hidden="true" className="text-fg-subtle">
            —
          </span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}
