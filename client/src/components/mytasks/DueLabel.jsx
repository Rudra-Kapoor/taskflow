import { AlertCircle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUE_TONES } from '@/lib/constants';
import { getDueInfo } from '@/lib/format';

/** Due date with an urgency tone: "Overdue · 2d" (rose), "Due today" (amber), "Oct 3"… */
export function DueLabel({ dueDate, status, showEmpty = true, className }) {
  const { label, tone, title } = getDueInfo(dueDate, status);
  if (tone === 'none' && !showEmpty) return null;
  const Icon = tone === 'overdue' ? AlertCircle : CalendarDays;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs',
        tone === 'overdue' || tone === 'today' ? 'font-semibold' : 'font-medium',
        DUE_TONES[tone]?.text,
        className,
      )}
    >
      {tone === 'none' ? (
        <span className="text-fg-subtle">—</span>
      ) : (
        <>
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {label}
        </>
      )}
      {tone === 'none' && <span className="sr-only">{label}</span>}
    </span>
  );
}
