import { Comment, Task } from '../models/index.js';
import { emitToProject } from '../socket/emitter.js';
import { SERVER_EVENTS } from '../socket/events.js';
import { ApiError } from '../utils/ApiError.js';
import { ACTIVITY, NOTIFICATION, USER_PUBLIC_FIELDS } from '../utils/constants.js';
import { truncate } from '../utils/format.js';
import { sameId } from '../utils/query.js';
import { assertProjectActive, loadCommentForMember, loadTaskForMember } from './access.service.js';
import { recordActivity, taskSnapshot } from './activity.service.js';
import { createNotifications, notificationMessages, taskRef } from './notification.service.js';

const AUTHOR_POPULATE = { path: 'author', select: USER_PUBLIC_FIELDS };
const EXCERPT_LENGTH = 120;

/**
 * Adjusts the denormalised `commentCount` of a task and returns the new value. Timestamps are
 * skipped: a comment is not an edit of the task itself.
 */
async function changeCommentCount(taskId, delta) {
  const filter = delta < 0 ? { _id: taskId, commentCount: { $gt: 0 } } : { _id: taskId };
  const task = await Task.findOneAndUpdate(
    filter,
    { $inc: { commentCount: delta } },
    { new: true, timestamps: false },
  )
    .select('commentCount')
    .lean();
  return task?.commentCount ?? 0;
}

/** Comments of a task, oldest first. */
export async function listComments(user, taskId) {
  const { task } = await loadTaskForMember(taskId, user._id);
  return Comment.find({ task: task._id }).sort({ createdAt: 1, _id: 1 }).populate(AUTHOR_POPULATE);
}

export async function addComment(actor, taskId, body) {
  const { task, project, team } = await loadTaskForMember(taskId, actor._id);
  assertProjectActive(project);

  const comment = await Comment.create({
    task: task._id,
    project: project._id,
    author: actor._id,
    body,
  });
  const [commentCount] = await Promise.all([
    changeCommentCount(task._id, 1),
    comment.populate(AUTHOR_POPULATE),
  ]);

  emitToProject(project._id, SERVER_EVENTS.COMMENT_CREATED, {
    comment,
    taskId: task._id,
    projectId: project._id,
    commentCount,
  });

  await Promise.all([
    recordActivity({
      actor,
      action: ACTIVITY.COMMENT_ADDED,
      team: team._id,
      project: project._id,
      task: task._id,
      meta: {
        ...taskSnapshot(task, project),
        commentId: comment._id,
        excerpt: truncate(body, EXCERPT_LENGTH),
      },
    }),
    createNotifications({
      recipients: [task.assignee, task.createdBy],
      actor,
      type: NOTIFICATION.TASK_COMMENTED,
      message: notificationMessages.taskCommented(actor.name, taskRef(task, project)),
      team: team._id,
      project: project._id,
      task: task._id,
    }),
  ]);

  return comment;
}

export async function updateComment(actor, commentId, body) {
  const { comment, task, project } = await loadCommentForMember(commentId, actor._id);
  if (!sameId(comment.author, actor._id)) {
    throw ApiError.forbidden('You can only edit your own comments');
  }
  assertProjectActive(project);

  const changed = comment.body !== body;
  if (changed) {
    comment.body = body;
    comment.editedAt = new Date();
    await comment.save();
  }
  await comment.populate(AUTHOR_POPULATE);

  if (changed) {
    emitToProject(project._id, SERVER_EVENTS.COMMENT_UPDATED, {
      comment,
      taskId: task._id,
      projectId: project._id,
    });
  }
  return comment;
}

export async function deleteComment(actor, commentId) {
  const { comment, task, project, team } = await loadCommentForMember(commentId, actor._id);
  if (!sameId(comment.author, actor._id) && !team.isManager(actor._id)) {
    throw ApiError.forbidden('You can only delete your own comments');
  }
  assertProjectActive(project);

  await comment.deleteOne();
  const commentCount = await changeCommentCount(task._id, -1);

  emitToProject(project._id, SERVER_EVENTS.COMMENT_DELETED, {
    _id: comment._id,
    taskId: task._id,
    projectId: project._id,
    commentCount,
  });
}
