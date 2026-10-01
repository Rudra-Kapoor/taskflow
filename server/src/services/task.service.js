import { Comment, Project, Task, User } from '../models/index.js';
import { emitToProject } from '../socket/emitter.js';
import { SERVER_EVENTS } from '../socket/events.js';
import { ApiError } from '../utils/ApiError.js';
import { ACTIVITY, NOTIFICATION, TASK_STATUSES } from '../utils/constants.js';
import { sameId, toId } from '../utils/query.js';
import {
  assertAssignable,
  assertProjectActive,
  loadProjectForMember,
  loadTaskForMember,
} from './access.service.js';
import { recordActivity, taskSnapshot, touchProject } from './activity.service.js';
import {
  createNotifications,
  deleteTaskNotifications,
  notificationMessages,
  taskRef,
} from './notification.service.js';
import { getEndPosition, resolveDropPosition } from './position.service.js';
import { TASK_POPULATE } from './serializers.js';

const STATUS_ORDER = Object.fromEntries(TASK_STATUSES.map((status, index) => [status, index]));

/** Edits of these fields are grouped into a single `task.updated` activity entry. */
const DETAIL_FIELDS = ['title', 'description', 'priority', 'dueDate', 'labels'];

const toTime = (date) => (date ? new Date(date).getTime() : null);
const toIsoString = (date) => (date ? new Date(date).toISOString() : null);

/** Normalised forms used to detect real changes (dates by instant, labels as a set). */
const comparable = {
  title: (value) => value ?? '',
  description: (value) => value ?? '',
  priority: (value) => value,
  dueDate: toTime,
  labels: (value) => JSON.stringify([...(value ?? [])].sort()),
};

/** Values written to the activity log; descriptions are left out to keep the log small. */
const loggedValue = {
  title: (value) => value,
  description: () => null,
  priority: (value) => value,
  dueDate: toIsoString,
  labels: (value) => [...(value ?? [])],
};

/* ------------------------------------------------------------------------------------------ */
/* Helpers                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** A completed task moved back to an open column. */
const isReopening = (statusChange) => statusChange?.from === 'completed';

/**
 * The due-soon reminder goes out once per due date, assignee and open period, so a new due date,
 * a new assignee or reopening a completed task makes the reminder job consider the task again.
 */
const rearmDueReminder = (task) => task.set('dueReminderSentAt', null);

/** `[{ field, from, to }]` for every detail field the update really changes. */
function diffDetails(task, input) {
  const changes = [];
  for (const field of DETAIL_FIELDS) {
    const next = input[field];
    if (next === undefined || comparable[field](next) === comparable[field](task[field])) continue;
    changes.push({ field, from: loggedValue[field](task[field]), to: loggedValue[field](next) });
  }
  return changes;
}

/** Atomically reserves the next task number of a project. */
async function nextTaskNumber(projectId) {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { $inc: { taskSeq: 1 } },
    { new: true, timestamps: false },
  ).select('+taskSeq');
  if (!project) throw ApiError.notFound('Project not found');
  return project.taskSeq;
}

/**
 * Inserts a task with the next number of its project. Should the counter ever lag behind the
 * existing numbers (e.g. after a manual data import) it is re-synced and the insert retried once.
 */
async function insertNumberedTask(projectId, data) {
  try {
    return await Task.create({ ...data, number: await nextTaskNumber(projectId) });
  } catch (error) {
    if (error.code !== 11000) throw error;

    const highest = await Task.findOne({ project: projectId })
      .sort({ number: -1 })
      .select('number')
      .lean();
    const number = highest?.number ?? 0;
    await Project.updateOne(
      { _id: projectId, taskSeq: { $lt: number } },
      { $set: { taskSeq: number } },
      { timestamps: false },
    );
    return Task.create({ ...data, number: await nextTaskNumber(projectId) });
  }
}

const notifyAssignee = (actor, task, project) =>
  createNotifications({
    recipients: [task.assignee],
    actor,
    type: NOTIFICATION.TASK_ASSIGNED,
    message: notificationMessages.taskAssigned(actor.name, taskRef(task, project)),
    team: project.team,
    project: project._id,
    task: task._id,
  });

async function onStatusChanged(actor, task, project, { from, to }) {
  await recordActivity({
    actor,
    action: ACTIVITY.TASK_STATUS_CHANGED,
    team: project.team,
    project: project._id,
    task: task._id,
    meta: { ...taskSnapshot(task, project), from, to },
  });
  await createNotifications({
    recipients: [task.assignee, task.createdBy],
    actor,
    type: NOTIFICATION.TASK_STATUS_CHANGED,
    message: notificationMessages.taskStatusChanged(actor.name, taskRef(task, project), to),
    team: project.team,
    project: project._id,
    task: task._id,
  });
}

/** `task` must already be populated (its new assignee is read from it). */
async function onAssigneeChanged(actor, task, project, previousAssigneeId) {
  const previous = previousAssigneeId
    ? await User.findById(previousAssigneeId).select('name').lean()
    : null;

  await recordActivity({
    actor,
    action: ACTIVITY.TASK_ASSIGNED,
    team: project.team,
    project: project._id,
    task: task._id,
    meta: {
      ...taskSnapshot(task, project),
      from: previousAssigneeId ? { _id: previousAssigneeId, name: previous?.name ?? null } : null,
      to: task.assignee ? { _id: task.assignee._id, name: task.assignee.name } : null,
    },
  });
  if (task.assignee) await notifyAssignee(actor, task, project);
}

/* ------------------------------------------------------------------------------------------ */
/* Queries                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Every task of a project, grouped by status (board column order) then by position. */
export async function listProjectTasks(user, projectId) {
  const { project } = await loadProjectForMember(projectId, user._id);
  const tasks = await Task.find({ project: project._id })
    .sort({ position: 1, _id: 1 })
    .populate(TASK_POPULATE);
  // Array#sort is stable, so each status group keeps its position order.
  return tasks.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export async function getTask(user, taskId) {
  const { task } = await loadTaskForMember(taskId, user._id);
  return task.populate(TASK_POPULATE);
}

/* ------------------------------------------------------------------------------------------ */
/* Mutations                                                                                  */
/* ------------------------------------------------------------------------------------------ */

export async function createTask(actor, projectId, input) {
  const { project, team } = await loadProjectForMember(projectId, actor._id);
  assertProjectActive(project);
  assertAssignable(team, input.assignee);

  const task = await insertNumberedTask(project._id, {
    ...input,
    project: project._id,
    createdBy: actor._id,
    position: await getEndPosition(project._id, input.status),
    completedAt: input.status === 'completed' ? new Date() : null,
  });
  await task.populate(TASK_POPULATE);
  emitToProject(project._id, SERVER_EVENTS.TASK_CREATED, task);

  await Promise.all([
    recordActivity({
      actor,
      action: ACTIVITY.TASK_CREATED,
      team: team._id,
      project: project._id,
      task: task._id,
      meta: { ...taskSnapshot(task, project), status: task.status },
    }),
    task.assignee && notifyAssignee(actor, task, project),
  ]);
  return task;
}

/**
 * Applies a partial update. Only real changes count: if nothing differs the task is returned
 * untouched without events, activity or notifications.
 */
export async function updateTask(actor, taskId, input) {
  const { task, project, team } = await loadTaskForMember(taskId, actor._id);
  assertProjectActive(project);
  assertAssignable(team, input.assignee);

  const detailChanges = diffDetails(task, input);
  const statusChange =
    input.status !== undefined && input.status !== task.status
      ? { from: task.status, to: input.status }
      : null;
  const previousAssigneeId = task.assignee;
  const assigneeChanged =
    input.assignee !== undefined && toId(input.assignee) !== toId(task.assignee);

  if (!detailChanges.length && !statusChange && !assigneeChanged) {
    return task.populate(TASK_POPULATE);
  }

  detailChanges.forEach(({ field }) => task.set(field, input[field]));
  if (assigneeChanged) task.assignee = input.assignee;
  if (statusChange) {
    task.status = statusChange.to;
    task.completedAt = statusChange.to === 'completed' ? new Date() : null;
    // A status change through the edit form moves the card to the end of its new column.
    task.position = await getEndPosition(project._id, statusChange.to, task._id);
  }
  const dueDateChanged = detailChanges.some(({ field }) => field === 'dueDate');
  if (dueDateChanged || assigneeChanged || isReopening(statusChange)) rearmDueReminder(task);
  await task.save();
  await task.populate(TASK_POPULATE);
  emitToProject(project._id, SERVER_EVENTS.TASK_UPDATED, task);

  // Sequential on purpose so the activity log always reads in the same order.
  if (statusChange) await onStatusChanged(actor, task, project, statusChange);
  if (assigneeChanged) await onAssigneeChanged(actor, task, project, previousAssigneeId);
  if (detailChanges.length) {
    await recordActivity({
      actor,
      action: ACTIVITY.TASK_UPDATED,
      team: team._id,
      project: project._id,
      task: task._id,
      meta: { ...taskSnapshot(task, project), changes: detailChanges },
    });
  }
  return task;
}

/** Drag & drop: changes column and/or order (see position.service.js). */
export async function moveTask(actor, taskId, { status, prevTaskId, nextTaskId }) {
  const { task, project } = await loadTaskForMember(taskId, actor._id);
  assertProjectActive(project);

  const { position, reordered } = await resolveDropPosition({
    projectId: project._id,
    taskId: task._id,
    status,
    prevTaskId,
    nextTaskId,
  });
  const statusChange = task.status !== status ? { from: task.status, to: status } : null;
  const moved = Boolean(statusChange) || position !== task.position;

  if (moved) {
    task.status = status;
    task.position = position;
    if (statusChange) task.completedAt = status === 'completed' ? new Date() : null;
    if (isReopening(statusChange)) rearmDueReminder(task);
    await task.save();
  }
  await task.populate(TASK_POPULATE);

  if (moved) emitToProject(project._id, SERVER_EVENTS.TASK_UPDATED, task);
  if (reordered.length) {
    emitToProject(project._id, SERVER_EVENTS.TASKS_REORDERED, {
      projectId: project._id,
      positions: reordered,
    });
  }
  if (statusChange) await onStatusChanged(actor, task, project, statusChange);
  // Reorders within a column are not logged, but they are still work in the project.
  else if (moved) await touchProject(project._id);

  return { task, reordered };
}

export async function deleteTask(actor, taskId) {
  const { task, project, team } = await loadTaskForMember(taskId, actor._id);
  if (!sameId(task.createdBy, actor._id) && !team.isManager(actor._id)) {
    throw ApiError.forbidden('Only the task creator or a team owner/admin can delete this task');
  }
  assertProjectActive(project);

  await Promise.all([Comment.deleteMany({ task: task._id }), deleteTaskNotifications(task._id)]);
  await task.deleteOne();

  emitToProject(project._id, SERVER_EVENTS.TASK_DELETED, { _id: task._id, projectId: project._id });
  await recordActivity({
    actor,
    action: ACTIVITY.TASK_DELETED,
    team: team._id,
    project: project._id,
    task: task._id,
    meta: taskSnapshot(task, project),
  });
}
