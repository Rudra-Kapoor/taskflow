import { Task } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { POSITION_GAP } from '../utils/constants.js';
import { sameId } from '../utils/query.js';

/**
 * Fractional ordering of tasks inside a board column.
 *
 * Every task has a numeric `position`; a column is sorted ascending. Dropping a card between
 * two others gives it the midpoint of their positions, so a move updates a single document.
 * After many drops into the same gap the midpoints get too close for floating point, and the
 * column is re-spaced (GAP, 2*GAP, ...) once.
 */
const MIN_GAP = 1e-6;

const invalidDrop = () => ApiError.badRequest('Invalid drop position');

/** Position that puts a task at the end of a column. */
export async function getEndPosition(projectId, status, excludeTaskId = null) {
  const filter = { project: projectId, status };
  if (excludeTaskId) filter._id = { $ne: excludeTaskId };

  const last = await Task.findOne(filter).sort({ position: -1 }).select('position').lean();
  return last ? last.position + POSITION_GAP : POSITION_GAP;
}

/**
 * Loads a drop neighbour. When several people drag at once, the board the client dropped on can
 * be stale: a neighbour deleted or moved to another column in the meantime is ignored (null, as
 * if it had not been sent) instead of failing the drop. The task itself or a task of another
 * project can never be a neighbour, so those are still rejected.
 */
async function loadNeighbour(neighbourId, { projectId, taskId, status }) {
  if (!neighbourId) return null;
  if (sameId(neighbourId, taskId)) throw invalidDrop();

  const neighbour = await Task.findById(neighbourId).select('project status position').lean();
  if (!neighbour) return null;
  if (!sameId(neighbour.project, projectId)) throw invalidDrop();
  return neighbour.status === status ? neighbour : null;
}

/**
 * Positions the moved task must sit between (null = open-ended), given at least one neighbour.
 * The client may hide tasks with filters, so the real neighbour is looked up in the full column
 * (excluding the task).
 */
async function findBounds({ projectId, taskId, status, prev, next }) {
  const column = { project: projectId, status };

  if (prev) {
    const successor = await Task.findOne({
      ...column,
      _id: { $nin: [taskId, prev._id] },
      position: { $gte: prev.position },
    })
      .sort({ position: 1, _id: 1 })
      .select('position')
      .lean();
    return { lower: prev.position, upper: successor?.position ?? null };
  }

  const predecessor = await Task.findOne({
    ...column,
    _id: { $nin: [taskId, next._id] },
    position: { $lte: next.position },
  })
    .sort({ position: -1, _id: -1 })
    .select('position')
    .lean();
  return { lower: predecessor?.position ?? null, upper: next.position };
}

const positionBetween = ({ lower, upper }) => {
  if (upper === null) return lower + POSITION_GAP;
  if (lower === null) return upper - POSITION_GAP;
  return (lower + upper) / 2;
};

const isGapTooSmall = ({ lower, upper }) =>
  lower !== null && upper !== null && upper - lower < MIN_GAP;

/**
 * Re-spaces a column evenly (ignoring the task being moved). Timestamps are left untouched
 * because the tasks' content did not change. Returns the tasks whose position changed.
 */
async function rebalanceColumn(projectId, status, excludeTaskId) {
  const tasks = await Task.find({ project: projectId, status, _id: { $ne: excludeTaskId } })
    .sort({ position: 1, _id: 1 })
    .select('position')
    .lean();

  const reordered = [];
  tasks.forEach((task, index) => {
    const position = (index + 1) * POSITION_GAP;
    if (task.position !== position) reordered.push({ _id: task._id, position });
  });

  if (reordered.length) {
    await Task.bulkWrite(
      reordered.map(({ _id, position }) => ({
        updateOne: { filter: { _id }, update: { $set: { position } } },
      })),
      { timestamps: false },
    );
  }
  return reordered;
}

/**
 * Resolves where a dragged task lands: right after `prevTaskId`, else right before
 * `nextTaskId`, else at the end of the column. Neighbours that were deleted or left the target
 * column meanwhile are skipped (see `loadNeighbour`).
 *
 * @returns {Promise<{ position: number, reordered: { _id, position }[] }>} `reordered` lists the
 *   other tasks moved by a re-balance (usually empty).
 */
export async function resolveDropPosition({ projectId, taskId, status, prevTaskId, nextTaskId }) {
  const context = { projectId, taskId, status };
  // Null when no usable neighbour is left, i.e. the task goes to the end of the column.
  const findDropBounds = async () => {
    const [prev, next] = await Promise.all([
      loadNeighbour(prevTaskId, context),
      loadNeighbour(nextTaskId, context),
    ]);
    return prev || next ? findBounds({ ...context, prev, next }) : null;
  };

  let bounds = await findDropBounds();
  let reordered = [];

  if (bounds && isGapTooSmall(bounds)) {
    reordered = await rebalanceColumn(projectId, status, taskId);
    // Re-read: the re-balance moved the neighbours (and a concurrent drag may have, too).
    bounds = await findDropBounds();
  }

  const position = bounds
    ? positionBetween(bounds)
    : await getEndPosition(projectId, status, taskId);
  return { position, reordered };
}
