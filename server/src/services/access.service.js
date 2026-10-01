import { Comment, Project, Task, Team } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Authorization helpers. Access is always derived from team membership:
 * user -> teams (members.user) -> projects (project.team) -> tasks / comments.
 */

export function getMemberTeamIds(userId) {
  return Team.find({ 'members.user': userId }).distinct('_id');
}

/** Ids of everyone who shares at least one team with the user (the user included). */
export function getTeammateIds(userId) {
  return Team.find({ 'members.user': userId }).distinct('members.user');
}

/** Map of teamId (string) -> the user's role in that team. */
export async function getMemberships(userId) {
  // The positional projection returns only the member entry matched by the filter.
  const teams = await Team.find({ 'members.user': userId }, { 'members.$': 1 }).lean();
  return new Map(teams.map((team) => [team._id.toString(), team.members[0].role]));
}

/** Ids of every project in the user's teams (optionally only active ones). */
export async function getAccessibleProjectIds(userId, { activeOnly = false } = {}) {
  const teamIds = await getMemberTeamIds(userId);
  if (!teamIds.length) return [];

  const filter = { team: { $in: teamIds } };
  if (activeOnly) filter.status = 'active';
  return Project.find(filter).distinct('_id');
}

export async function loadTeamForMember(teamId, userId) {
  const team = await Team.findById(teamId);
  if (!team) throw ApiError.notFound('Team not found');
  if (!team.isMember(userId)) throw ApiError.forbidden('You are not a member of this team');
  return team;
}

const MANAGERS_ONLY = 'Only team owners and admins can do this';

export function assertTeamManager(team, userId, message = MANAGERS_ONLY) {
  if (!team.isManager(userId)) throw ApiError.forbidden(message);
}

export async function loadProjectForMember(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const team = await Team.findById(project.team);
  if (!team?.isMember(userId)) {
    throw ApiError.forbidden('You do not have access to this project');
  }
  return { project, team };
}

export async function loadTaskForMember(taskId, userId) {
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  const { project, team } = await loadProjectForMember(task.project, userId);
  return { task, project, team };
}

export async function loadCommentForMember(commentId, userId) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const { task, project, team } = await loadTaskForMember(comment.task, userId);
  return { comment, task, project, team };
}

/** Tasks can only be assigned to members of the project's team (`null` = unassigned). */
export function assertAssignable(team, assigneeId) {
  if (!assigneeId || team.isMember(assigneeId)) return;

  const message = "Assignee must be a member of this project's team";
  throw ApiError.badRequest(message, [{ field: 'assignee', location: 'body', message }]);
}

/** Archived projects are read-only for tasks and comments. */
export function assertProjectActive(project) {
  if (project.status === 'archived') {
    throw ApiError.badRequest('This project is archived. Restore it to make changes.');
  }
}
