import { Project, Task, Team } from '../models/index.js';
import { TASK_STATUSES, USER_PUBLIC_FIELDS } from '../utils/constants.js';
import { toId } from '../utils/query.js';

/**
 * Builders for the API resource shapes documented in docs/API.md. Keeping them in one place
 * guarantees REST responses and Socket.IO payloads always look the same.
 */

export const TEAM_POPULATE = [
  { path: 'owner', select: USER_PUBLIC_FIELDS },
  { path: 'members.user', select: USER_PUBLIC_FIELDS },
];

export const PROJECT_POPULATE = [
  { path: 'team', select: 'name' },
  { path: 'createdBy', select: USER_PUBLIC_FIELDS },
];

export const TASK_POPULATE = [
  { path: 'assignee', select: USER_PUBLIC_FIELDS },
  { path: 'createdBy', select: USER_PUBLIC_FIELDS },
  { path: 'project', select: 'name key color team' },
];

/* ------------------------------------------------------------------------------------------ */
/* Users                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * API `UserPublic` shape as a plain object with a string `_id`. Used where a user is sent outside
 * of a populated document: socket presence lists and profile-change broadcasts.
 */
export const toUserPublic = (user) => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  title: user.title,
  avatarColor: user.avatarColor,
});

/* ------------------------------------------------------------------------------------------ */
/* Teams                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * API `Team` shape for a populated team. `myRole` is only included when `viewerId` is given and
 * `projectCount` only when it is known (the team embedded in a project omits both).
 */
export function toTeamResponse(team, { viewerId, projectCount } = {}) {
  const body = {
    _id: team._id,
    name: team.name,
    description: team.description,
    owner: team.owner,
    members: team.members
      .filter((member) => member.user)
      .map(({ user, role, joinedAt }) => ({ user, role, joinedAt })),
  };
  if (viewerId) body.myRole = team.getRole(viewerId);
  if (projectCount !== undefined) body.projectCount = projectCount;
  body.createdAt = team.createdAt;
  body.updatedAt = team.updatedAt;
  return body;
}

async function countProjectsByTeam(teamIds) {
  const rows = await Project.aggregate([
    { $match: { team: { $in: teamIds } } },
    { $group: { _id: '$team', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export async function presentTeams(teams, { viewerId } = {}) {
  if (!teams.length) return [];
  await Team.populate(teams, TEAM_POPULATE);
  const counts = await countProjectsByTeam(teams.map((team) => team._id));
  return teams.map((team) =>
    toTeamResponse(team, { viewerId, projectCount: counts.get(team._id.toString()) ?? 0 }),
  );
}

/**
 * Populates a team once and returns a renderer, so the same state can be sent to several
 * audiences: `render(userId)` includes that user's `myRole`, `render()` is the room broadcast.
 */
export async function prepareTeamView(team) {
  await team.populate(TEAM_POPULATE);
  const projectCount = await Project.countDocuments({ team: team._id });
  return (viewerId) => toTeamResponse(team, { viewerId, projectCount });
}

/* ------------------------------------------------------------------------------------------ */
/* Projects                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export const emptyTaskCounts = () => ({ todo: 0, in_progress: 0, completed: 0, total: 0 });

/** Map of projectId (string) -> { todo, in_progress, completed, total }, in one aggregation. */
export async function countTasksByProject(projectIds) {
  const rows = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const counts = new Map();
  for (const { _id, count } of rows) {
    const key = _id.project.toString();
    const entry = counts.get(key) ?? emptyTaskCounts();
    if (TASK_STATUSES.includes(_id.status)) entry[_id.status] = count;
    entry.total += count;
    counts.set(key, entry);
  }
  return counts;
}

/**
 * API `Project` shape for a populated project. `team` defaults to the populated `{ _id, name }`;
 * the detail endpoint passes the full team instead.
 */
export function toProjectResponse(project, { taskCounts = emptyTaskCounts(), myRole, team } = {}) {
  const body = {
    _id: project._id,
    name: project.name,
    key: project.key,
    description: project.description,
    color: project.color,
    status: project.status,
    team: team ?? project.team,
    createdBy: project.createdBy,
    taskCounts,
  };
  if (myRole !== undefined) body.myRole = myRole;
  body.lastActivityAt = project.lastActivityAt;
  body.createdAt = project.createdAt;
  body.updatedAt = project.updatedAt;
  return body;
}

/**
 * List shape for several projects. `roles` (teamId -> role) adds the viewer's `myRole`;
 * without it the payload is suitable for a team-room broadcast.
 */
export async function presentProjects(projects, { roles } = {}) {
  if (!projects.length) return [];
  await Project.populate(projects, PROJECT_POPULATE);
  const counts = await countTasksByProject(projects.map((project) => project._id));
  return projects.map((project) =>
    toProjectResponse(project, {
      taskCounts: counts.get(project._id.toString()) ?? emptyTaskCounts(),
      myRole: roles ? (roles.get(toId(project.team)) ?? null) : undefined,
    }),
  );
}

/**
 * Single-project counterpart of `prepareTeamView`: `render(role)` includes `myRole`,
 * `render()` is the team-room broadcast.
 */
export async function prepareProjectView(project) {
  await project.populate(PROJECT_POPULATE);
  const counts = await countTasksByProject([project._id]);
  const taskCounts = counts.get(project._id.toString()) ?? emptyTaskCounts();
  return (myRole) => toProjectResponse(project, { taskCounts, myRole });
}
