import { CheckCircle2, GripVertical, MessageSquare } from 'lucide-react';
import { Avatar, LabelChip, PriorityBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getTaskKey, pluralize } from '@/lib/format';
import { DueChip } from './DueChip';

const MAX_LABELS = 3;

/**
 * Board card: key + priority, title, labels and a footer with due date, comments and assignee.
 * `draggable` shows a grip on hover / focus; `isDragging` lifts and tilts the card;
 * `highlighted` flashes it after a teammate's change.
 */
export function TaskCard({ task, draggable = false, isDragging = false, highlighted = false }) {
  const done = task.status === 'completed';
  const labels = task.labels ?? [];
  const hiddenLabels = labels.slice(MAX_LABELS);

  return (
    <article
      className={cn(
        'relative rounded-lg border bg-surface p-3 shadow-xs dark:bg-surface-hover',
        'transition-[border-color,box-shadow,background-color,transform] duration-200 ease-out',
        'group-focus-visible:border-brand-500 group-focus-visible:ring-2 group-focus-visible:ring-brand-500',
        isDragging
          ? 'rotate-[2.5deg] border-brand-300 shadow-xl shadow-slate-900/15 ring-2 ring-brand-500/25 dark:border-brand-400/50 dark:shadow-black/50'
          : 'border-line hover:border-line-strong hover:shadow-sm',
        highlighted &&
          !isDragging &&
          'border-brand-300 bg-brand-50/70 ring-2 ring-brand-400/30 dark:border-brand-400/40 dark:bg-brand-500/10',
      )}
    >
      {draggable && (
        <GripVertical
          aria-hidden="true"
          className={cn(
            'absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle opacity-0',
            'transition-opacity duration-150 group-hover:opacity-70 group-focus-visible:opacity-70',
            isDragging && 'opacity-70',
          )}
        />
      )}

      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 font-mono text-[11px] font-medium text-fg-subtle">
          {done && (
            <CheckCircle2
              className="h-3.5 w-3.5 shrink-0 text-emerald-500"
              aria-label="Completed"
            />
          )}
          <span className="truncate">{getTaskKey(task)}</span>
        </span>
        <PriorityBadge
          priority={task.priority}
          showLabel={false}
          size="sm"
          className="ml-auto"
        />
      </div>

      <h3
        className={cn(
          'line-clamp-2 break-words text-sm font-medium leading-snug',
          done ? 'text-fg-muted' : 'text-fg',
        )}
      >
        {task.title}
      </h3>

      {labels.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {labels.slice(0, MAX_LABELS).map((label) => (
            <LabelChip key={label} label={label} className="max-w-[9rem]" />
          ))}
          {hiddenLabels.length > 0 && (
            <span
              title={hiddenLabels.join(', ')}
              className="inline-flex h-5 items-center rounded-md bg-surface-muted px-1.5 text-[11px] font-medium text-fg-muted dark:bg-surface"
            >
              +{hiddenLabels.length}
              <span className="sr-only"> more labels</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex min-h-6 items-center gap-2">
        <DueChip dueDate={task.dueDate} status={task.status} />
        {task.commentCount > 0 && (
          <span
            title={pluralize(task.commentCount, 'comment')}
            className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-fg-muted"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Comments: </span>
            {task.commentCount}
          </span>
        )}
        <Avatar user={task.assignee} size="sm" showTooltip className="ml-auto" />
      </div>
    </article>
  );
}
