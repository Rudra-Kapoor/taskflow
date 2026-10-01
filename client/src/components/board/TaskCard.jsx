import { MessageSquare } from 'lucide-react';
import { CheckGlyph, PriorityGlyph } from '@/components/tasks/TaskGlyphs';
import { Avatar, LabelChip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getTaskKey, pluralize } from '@/lib/format';
import { DueChip } from './DueChip';

const MAX_LABELS = 3;

/**
 * Board card: mono key + priority glyph, title, outlined labels and a footer with due date,
 * comments and assignee. `isDragging` lifts it (ink outline, shadow, slight scale);
 * `highlighted` flashes it after a teammate's change. The whole card is the drag handle
 * (BoardCard), so there is no separate grip.
 */
export function TaskCard({ task, isDragging = false, highlighted = false }) {
  const done = task.status === 'completed';
  const labels = task.labels ?? [];
  const hiddenLabels = labels.slice(MAX_LABELS);

  return (
    <article
      className={cn(
        'relative rounded-lg border bg-surface px-3 pb-2.5 pt-2.5 dark:bg-surface-hover',
        'transition-[border-color,box-shadow,background-color,transform] duration-150 ease-out',
        'group-focus-visible:ring-2 group-focus-visible:ring-brand-500',
        'group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-surface-muted',
        isDragging
          ? 'rotate-[0.6deg] scale-[1.02] border-fg/80 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_14px_32px_-6px_rgb(0_0_0/0.22)] dark:border-fg/60 dark:shadow-[0_14px_32px_-6px_rgb(0_0_0/0.6)]'
          : 'border-line hover:border-fg/25 dark:hover:border-fg/25',
        highlighted &&
          !isDragging &&
          'border-brand-400/70 bg-brand-50 dark:border-brand-400/50 dark:bg-brand-500/10',
      )}
    >
      <div className="flex h-4 items-center gap-1.5">
        {done && <CheckGlyph className="h-3 w-3" />}
        <span className="truncate font-mono text-[11px] leading-none tracking-[0.02em] text-fg-muted">
          {getTaskKey(task)}
        </span>
        {done && <span className="sr-only">Completed</span>}
        <PriorityGlyph priority={task.priority} labelled muted={done} className="ml-auto" />
      </div>

      <h3
        className={cn(
          'mt-1.5 line-clamp-2 break-words text-sm font-medium leading-[1.4] tracking-[-0.005em]',
          done ? 'text-fg-muted' : 'text-fg',
        )}
      >
        {task.title}
      </h3>

      {labels.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {labels.slice(0, MAX_LABELS).map((label) => (
            <LabelChip key={label} label={label} className="max-w-[9rem]" />
          ))}
          {hiddenLabels.length > 0 && (
            <span
              title={hiddenLabels.join(', ')}
              className="inline-flex h-5 items-center px-1 font-mono text-[11px] text-fg-muted"
            >
              +{hiddenLabels.length}
              <span className="sr-only"> more labels</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex h-6 items-center gap-3">
        <DueChip dueDate={task.dueDate} status={task.status} />
        {task.commentCount > 0 && (
          <span
            title={pluralize(task.commentCount, 'comment')}
            className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-fg-muted"
          >
            <MessageSquare className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">Comments: </span>
            {task.commentCount}
          </span>
        )}
        <Avatar user={task.assignee} size="sm" showTooltip className="ml-auto" />
      </div>
    </article>
  );
}
