import { memo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/cn';
import { TaskCard } from './TaskCard';

/** Keeps the card focusable/clickable when dragging is disabled (archived projects). */
const STATIC_HANDLE_PROPS = { role: 'button', tabIndex: 0 };

/**
 * Draggable wrapper around a board card. The whole card is the drag handle: mouse / touch drag,
 * Space + arrow keys for keyboard dragging, click or Enter to open the task. Memoised: `onOpen`
 * must be stable (`useTaskModal().openTask`) so URL changes don't re-render every card.
 */
export const BoardCard = memo(function BoardCard({
  task,
  index,
  readOnly,
  highlighted,
  onOpen,
}) {
  return (
    <Draggable draggableId={task._id} index={index} isDragDisabled={readOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(provided.dragHandleProps ?? STATIC_HANDLE_PROPS)}
          onClick={() => onOpen(task._id)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || snapshot.isDragging) return;
            event.preventDefault();
            onOpen(task._id);
          }}
          className={cn(
            'group mb-2 rounded-lg outline-none',
            readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
          )}
        >
          <TaskCard
            task={task}
            isDragging={snapshot.isDragging && !snapshot.isDropAnimating}
            highlighted={highlighted}
          />
        </div>
      )}
    </Draggable>
  );
});
