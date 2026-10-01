import { Activity, Project } from '../models/index.js';
import { emitToTeam } from '../socket/emitter.js';
import { SERVER_EVENTS } from '../socket/events.js';
import { USER_PUBLIC_FIELDS } from '../utils/constants.js';
import { formatTaskKey } from '../utils/format.js';
import { logger } from '../utils/logger.js';
import { toId } from '../utils/query.js';
import { getMemberTeamIds, loadProjectForMember, loadTaskForMember } from './access.service.js';

const ACTOR_POPULATE = { path: 'actor', select: USER_PUBLIC_FIELDS };
const NEWEST_FIRST = { createdAt: -1, _id: -1 };

/** Snapshot stored in the meta of every project-scoped activity. */
export const projectSnapshot = (project) => ({
  projectName: project.name,
  projectKey: project.key,
});

/** Snapshot stored in the meta of every task-scoped activity. */
export const taskSnapshot = (task, project) => ({
  ...projectSnapshot(project),
  taskKey: formatTaskKey(project.key, task.number),
  taskTitle: task.title,
});

/**
 * Moves a project's `lastActivityAt` forward (`$max`: concurrent writes never move it back).
 * `updatedAt` is left alone, since work inside a project is not an edit of the project. A side
 * effect like the activity log, so failures are logged instead of failing the request.
 */
export async function touchProject(projectId, at = new Date()) {
  try {
    await Project.updateOne(
      { _id: projectId },
      { $max: { lastActivityAt: at } },
      { timestamps: false },
    );
  } catch (error) {
    logger.error(`Failed to update the last activity of project ${projectId}`, error);
  }
}

/**
 * Appends an entry to the audit log and pushes it to the team room; a project-scoped entry also
 * marks its project as recently active. The log is a side effect of the actual change, so
 * failures are logged and swallowed instead of failing the request.
 */
export async function recordActivity({
  actor,
  action,
  team,
  project = null,
  task = null,
  meta = {},
}) {
  try {
    const activity = await Activity.create({
      actor: toId(actor),
      action,
      team: toId(team),
      project: toId(project),
      task: toId(task),
      meta,
    });
    await Promise.all([
      activity.populate(ACTOR_POPULATE),
      activity.project && touchProject(activity.project, activity.createdAt),
    ]);
    emitToTeam(activity.team, SERVER_EVENTS.ACTIVITY_CREATED, activity);
    return activity;
  } catch (error) {
    logger.error(`Failed to record activity "${action}"`, error);
    return null;
  }
}

/** `nextCursor` of a page: the (createdAt, _id) position of its last entry. */
const encodeCursor = (activity) => `${activity.createdAt.toISOString()}_${activity._id}`;

/**
 * Entries that come strictly after the cursor in NEWEST_FIRST order. The `$lte` bound repeats
 * part of the `$or` on purpose: it lets the index scan start at the cursor (with the `$or` alone
 * the multi-team feed falls back to an in-memory sort). A plain-date cursor has no id.
 */
function olderThan({ createdAt, id }) {
  if (!id) return { createdAt: { $lt: createdAt } };
  return {
    createdAt: { $lte: createdAt },
    $or: [{ createdAt: { $lt: createdAt } }, { _id: { $lt: id } }],
  };
}

/**
 * Newest-first keyset pagination. `before` is the previous page's `nextCursor`, parsed by
 * validators/common.js. The (createdAt, _id) pair is unique, so entries recorded in the same
 * millisecond are never skipped and every page but the last holds exactly `limit` entries.
 */
async function listActivities(filter, { before, limit }) {
  const query = before ? { ...filter, ...olderThan(before) } : filter;
  const docs = await Activity.find(query)
    .sort(NEWEST_FIRST)
    .limit(limit + 1)
    .populate(ACTOR_POPULATE);

  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  return { items, meta: { nextCursor: hasMore ? encodeCursor(items.at(-1)) : null, hasMore } };
}

export async function listProjectActivity(user, projectId, cursor) {
  const { project } = await loadProjectForMember(projectId, user._id);
  return listActivities({ project: project._id }, cursor);
}

export async function listTaskActivity(user, taskId, cursor) {
  const { task } = await loadTaskForMember(taskId, user._id);
  return listActivities({ task: task._id }, cursor);
}

/** Activity from every team the user belongs to. */
export async function listActivityFeed(user, cursor) {
  const teamIds = await getMemberTeamIds(user._id);
  if (!teamIds.length) return { items: [], meta: { nextCursor: null, hasMore: false } };
  return listActivities({ team: { $in: teamIds } }, cursor);
}
