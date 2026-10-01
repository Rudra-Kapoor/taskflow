import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { StatusDot } from '@/components/tasks/TaskGlyphs';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { STATUS_META } from '@/lib/constants';
import { pluralize } from '@/lib/format';
import { BoardCard } from './BoardCard';
import { QuickAddTask } from './QuickAddTask';

/**
 * Lane surfaces are opaque (the drag-over tint is an ink mix of the lane colour) so the sticky
 * header can share the background of the cards scrolling underneath it.
 */
const SURFACE = {
  idle: 'bg-surface-muted',
  over: 'bg-[color:color-mix(in_srgb,rgb(var(--color-fg))_5%,rgb(var(--color-surface-muted)))]',
};

function EmptyColumn({ filtered, readOnly }) {
  let hint = 'Drop a card here or add one below';
  if (filtered) hint = 'Try other filters';
  else if (readOnly) hint = null;

  return (
    <div className="mb-2 flex h-24 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-line-strong px-3 text-center">
      <p className="text-xs font-medium text-fg-muted">
        {filtered ? 'No matching tasks' : 'No tasks yet'}
      </p>
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

/**
 * One status lane: mono header with status dot, count and a quiet "+" button, the droppable
 * card list (the whole lane body accepts drops) and the inline quick-add field.
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
  const countLabel = filtered
    ? `${tasks.length} of ${pluralize(totalCount, 'task')} shown`
    : pluralize(tasks.length, 'task');

  return (
    <Droppable droppableId={status} isDropDisabled={readOnly}>
      {(provided, snapshot) => {
        const background = snapshot.isDraggingOver ? SURFACE.over : SURFACE.idle;
        return (
          <section
            aria-label={`${meta.label}, ${countLabel}`}
            className={cn(
              'flex w-[78vw] max-w-[20rem] shrink-0 snap-center flex-col rounded-xl border',
              'transition-[background-color,border-color] duration-150',
              'md:w-auto md:min-w-0 md:max-w-none',
              background,
              snapshot.isDraggingOver ? 'border-fg/20' : 'border-transparent',
            )}
          >
            {/* Sticks below the top bar while a long lane scrolls (the page is the scroller). */}
            <header
              className={cn(
                'sticky top-0 z-10 flex h-11 shrink-0 items-center gap-2.5 rounded-t-xl pl-3.5 pr-1.5',
                'transition-colors duration-150',
                background,
              )}
            >
              <StatusDot status={status} />
              <h2 className="truncate font-mono text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-fg">
                {meta.label}
              </h2>
              <span
                title={countLabel}
                className="font-mono text-[11px] leading-none tabular-nums text-fg-muted"
              >
                {filtered ? `${tasks.length}/${totalCount}` : tasks.length}
              </span>
              {!readOnly && (
                <IconButton
                  icon={Plus}
                  label={`Add task to ${meta.label}`}
                  size="xs"
                  onClick={() => onAddTask(status)}
                  className="ml-auto touch:h-9 touch:w-9"
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
        );
      }}
    </Droppable>
  );
}
