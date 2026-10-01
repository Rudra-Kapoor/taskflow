import { Droppable } from '@hello-pangea/dnd';
import { Inbox, Plus, SearchX } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { STATUS_META } from '@/lib/constants';
import { pluralize } from '@/lib/format';
import { BoardCard } from './BoardCard';
import { QuickAddTask } from './QuickAddTask';

/**
 * Column surfaces are opaque (the drag-over tint is mixed into the column colour) so the sticky
 * header can share the background of the cards scrolling underneath it.
 */
const SURFACE = {
  idle: 'bg-surface-muted',
  over:
    'bg-[color:color-mix(in_srgb,theme(colors.brand.500)_7%,rgb(var(--color-surface-muted)))] ' +
    'dark:bg-[color:color-mix(in_srgb,theme(colors.brand.400)_9%,rgb(var(--color-surface-muted)))]',
};

function EmptyColumn({ filtered, readOnly }) {
  const Icon = filtered ? SearchX : Inbox;
  let hint = 'Drag a card here or add one below';
  if (filtered) hint = 'Try other filters';
  else if (readOnly) hint = null;

  return (
    <div className="mb-2 flex h-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line-strong/60 px-3 text-center">
      <Icon className="mb-0.5 h-4 w-4 text-fg-subtle" aria-hidden="true" />
      <p className="text-xs font-medium text-fg-muted">
        {filtered ? 'No matching tasks' : 'No tasks yet'}
      </p>
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

/**
 * One status column: header with count and "+" button, the droppable card list (the whole column
 * body accepts drops) and the inline quick-add field.
 */
export function BoardColumn({
  status,
  tasks,
  totalCount,
  filtered,
  readOnly,
  projectId,
  highlightedIds,
  onOpenTask,
  onAddTask,
  onTaskCreated,
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const countLabel = filtered
    ? `${tasks.length} of ${pluralize(totalCount, 'task')} shown`
    : pluralize(tasks.length, 'task');

  return (
    <Droppable droppableId={status} isDropDisabled={readOnly}>
      {(provided, snapshot) => (
        <section
          aria-label={`${meta.label}, ${countLabel}`}
          className={cn(
            'flex w-[76vw] max-w-[21rem] shrink-0 snap-center flex-col rounded-xl border',
            'transition-[background-color,border-color,box-shadow] duration-150',
            'md:w-auto md:min-w-0 md:max-w-none',
            snapshot.isDraggingOver
              ? cn('border-brand-300 ring-2 ring-brand-500/15 dark:border-brand-400/40', SURFACE.over)
              : cn('border-line/70 dark:border-line/50', SURFACE.idle),
          )}
        >
          {/* Sticks below the top bar while a long column scrolls (the page is the scroller). */}
          <header
            className={cn(
              'sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 rounded-t-xl pl-3.5 pr-2',
              'transition-colors duration-150',
              snapshot.isDraggingOver ? SURFACE.over : SURFACE.idle,
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', meta.text)} aria-hidden="true" />
            <h2 className="truncate text-[13px] font-semibold text-fg">{meta.label}</h2>
            <span
              title={countLabel}
              className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-fg-muted ring-1 ring-inset ring-line dark:bg-surface-hover"
            >
              {filtered ? `${tasks.length}/${totalCount}` : tasks.length}
            </span>
            {!readOnly && (
              <IconButton
                icon={Plus}
                label={`Add task to ${meta.label}`}
                size="xs"
                onClick={() => onAddTask(status)}
                className="ml-auto"
              />
            )}
          </header>

          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex min-h-[7rem] flex-1 flex-col px-2 pb-2"
          >
            {tasks.map((task, index) => (
              <BoardCard
                key={task._id}
                task={task}
                index={index}
                readOnly={readOnly}
                highlighted={highlightedIds.has(task._id)}
                onOpen={onOpenTask}
              />
            ))}
            {provided.placeholder}
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <EmptyColumn filtered={filtered} readOnly={readOnly} />
            )}
            {!readOnly && (
              <QuickAddTask
                projectId={projectId}
                status={status}
                statusLabel={meta.label}
                onCreated={onTaskCreated}
              />
            )}
          </div>
        </section>
      )}
    </Droppable>
  );
}
