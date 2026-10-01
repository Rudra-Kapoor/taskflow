import { useMemo, useRef, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { useMoveTask } from '@/hooks/queries/tasks';
import { computeLocalPosition } from '@/lib/cache';
import { cn } from '@/lib/cn';
import { TASK_STATUSES } from '@/lib/constants';
import { getTaskKey } from '@/lib/format';
import { BoardColumn } from './BoardColumn';
import { applyPendingMoves, findDropNeighbours, groupTasksByStatus } from './boardUtils';
import { createDragAnnouncer, DRAG_INSTRUCTIONS } from './dragAnnouncements';

/**
 * Kanban board with drag & drop between and within the three status columns.
 *
 * - `tasks`: every task of the project (positions are computed against full columns);
 *   `visibleTasks`: the filtered subset that is displayed.
 * - The displayed columns are frozen during a drag: real-time changes from teammates are applied
 *   once the card is dropped instead of reshuffling the list under the pointer. The drop's
 *   neighbours are then resolved against the live cache (tasks may have moved or vanished).
 * - A drop is applied locally right away (`pendingMoves`) and persisted with the optimistic
 *   `useMoveTask`, so the card never flashes back while the cache catches up.
 * - Screen readers hear the task key, title and column names (custom announcements).
 * - Below `md` the board scrolls horizontally; that scrolling is locked while dragging so the
 *   page (`<main>`) stays the only scroll container drag & drop has to track.
 */
export function Board({
  projectId,
  tasks,
  visibleTasks,
  filtered,
  readOnly,
  highlightedIds,
  onOpenTask,
  onAddTask,
  onTaskCreated,
}) {
  const { mutateAsync: moveTask } = useMoveTask(projectId);
  const [pendingMoves, setPendingMoves] = useState({});
  const [frozenColumns, setFrozenColumns] = useState(null);
  const moveSequence = useRef(0);

  const columns = useMemo(
    () => groupTasksByStatus(applyPendingMoves(visibleTasks, pendingMoves)),
    [visibleTasks, pendingMoves],
  );
  const totals = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const shownColumns = frozenColumns ?? columns;

  const announcer = createDragAnnouncer({
    getTask: (taskId) => tasks.find((task) => task._id === taskId),
    getColumnSize: (status) => shownColumns[status]?.length ?? 0,
  });

  const clearPendingMove = (taskId, token) => {
    setPendingMoves((current) => {
      if (current[taskId]?.token !== token) return current;
      const { [taskId]: _settled, ...rest } = current;
      return rest;
    });
  };

  // Runs inside flushSync (library), before the drag dimensions are captured.
  const handleBeforeCapture = () => setFrozenColumns(columns);

  const handleDrop = ({ draggableId, source, destination }) => {
    const displayed = shownColumns;
    setFrozenColumns(null);
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const liveTasks = applyPendingMoves(tasks, pendingMoves);
    if (!liveTasks.some((task) => task._id === draggableId)) {
      const dropped = displayed[source.droppableId]?.find((task) => task._id === draggableId);
      toast(`${dropped ? getTaskKey(dropped) : 'This task'} was deleted while you moved it.`);
      return;
    }

    const status = destination.droppableId;
    const liveColumn = liveTasks.filter(
      (task) => task.status === status && task._id !== draggableId,
    );
    const displayedColumn = displayed[status].filter((task) => task._id !== draggableId);
    const { prevTaskId, nextTaskId } = findDropNeighbours(
      displayedColumn,
      destination.index,
      liveColumn,
    );

    moveSequence.current += 1;
    const token = moveSequence.current;
    setPendingMoves((current) => ({
      ...current,
      [draggableId]: {
        status,
        position: computeLocalPosition(liveColumn, prevTaskId, nextTaskId),
        token,
      },
    }));

    moveTask({ taskId: draggableId, status, prevTaskId, nextTaskId })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not move the task')))
      .finally(() => clearPendingMove(draggableId, token));
  };

  return (
    <DragDropContext
      dragHandleUsageInstructions={DRAG_INSTRUCTIONS}
      onBeforeCapture={handleBeforeCapture}
      onDragStart={(start, provided) => provided.announce(announcer.start(start))}
      onDragUpdate={(update, provided) => provided.announce(announcer.update(update))}
      onDragEnd={(result, provided) => {
        provided.announce(announcer.end(result));
        handleDrop(result);
      }}
    >
      <div
        className={cn(
          '-mx-4 flex flex-1 items-stretch gap-3 px-4 pb-3 sm:-mx-6 sm:px-6',
          'snap-x snap-mandatory scroll-px-4 sm:scroll-px-6',
          frozenColumns ? 'max-md:overflow-hidden' : 'max-md:overflow-x-auto',
          'md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-4 md:px-0 md:pb-0 xl:gap-5',
        )}
      >
        {TASK_STATUSES.map(({ value }) => (
          <BoardColumn
            key={value}
            status={value}
            tasks={shownColumns[value]}
            totalCount={totals[value].length}
            filtered={filtered}
            readOnly={readOnly}
            projectId={projectId}
            highlightedIds={highlightedIds}
            onOpenTask={onOpenTask}
            onAddTask={onAddTask}
            onTaskCreated={onTaskCreated}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
