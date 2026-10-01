import { STATUS_META } from '@/lib/constants';
import { getTaskKey } from '@/lib/format';

/** Read out when a card gets keyboard focus (replaces the library's generic instructions). */
export const DRAG_INSTRUCTIONS =
  'Press Space to pick up the task, use the arrow keys to move it within or between columns, ' +
  'then press Space to drop it or Escape to cancel. Press Enter to open the task.';

const columnName = (status) => STATUS_META[status]?.label ?? status;
const position = (index, total) => `position ${index + 1} of ${total}`;

/**
 * Screen-reader announcements for board drag & drop that name the task (key and title) and the
 * status columns, instead of raw ids. `getTask(id)` and `getColumnSize(status)` describe the
 * board as displayed during the drag.
 */
export function createDragAnnouncer({ getTask, getColumnSize }) {
  const describe = (taskId) => {
    const task = getTask(taskId);
    return task ? `${getTaskKey(task)}, ${task.title}` : 'The task';
  };
  // Moving to another column adds a slot there.
  const sizeAt = (source, destination) =>
    getColumnSize(destination.droppableId) +
    (source.droppableId === destination.droppableId ? 0 : 1);

  return {
    start: ({ draggableId, source }) =>
      `Picked up ${describe(draggableId)}. ${columnName(source.droppableId)}, ` +
      `${position(source.index, getColumnSize(source.droppableId))}.`,
    update: ({ source, destination }) =>
      destination
        ? `${columnName(destination.droppableId)}, ` +
          `${position(destination.index, sizeAt(source, destination))}.`
        : 'Not over a column. Dropping here cancels the move.',
    end: ({ draggableId, source, destination, reason }) => {
      const task = describe(draggableId);
      if (reason === 'CANCEL' || !destination) {
        return `Move cancelled. ${task} stays in ${columnName(source.droppableId)}.`;
      }
      const where = position(destination.index, sizeAt(source, destination));
      return `Dropped ${task} in ${columnName(destination.droppableId)}, ${where}.`;
    },
  };
}
