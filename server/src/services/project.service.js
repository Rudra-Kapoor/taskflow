import { Activity, Comment, Project, Task } from '../models/index.js';
import { closeProjectRoom, emitToTeam } from '../socket/emitter.js';
import { SERVER_EVENTS } from '../socket/events.js';
import { ApiError } from '../utils/ApiError.js';
import { ACTIVITY, USER_PUBLIC_FIELDS } from '../utils/constants.js';
import { containsRegex } from '../utils/query.js';
import {
  assertTeamManager,
  getMemberships,
  loadProjectForMember,
  loadTeamForMember,
} from './access.service.js';
import { projectSnapshot, recordActivity } from './activity.service.js';
import { bulkDeleteNotifications } from './notification.service.js';
import {
  TEAM_POPULATE,
  countTasksByProject,
  emptyTaskCounts,
  prepareProjectView,
  presentProjects,
  toProjectResponse,
  toTeamResponse,
} from './serializers.js';

const EDITABLE_FIELDS = ['name', 'key', 'description', 'color', 'status'];
/** Only these fields are worth a before/after entry in the activity log. */
const LOGGED_CHANGES = ['name', 'status'];

const keyConflict = (key) => ApiError.conflict(`Project key ${key} is already used in this team`);

async function assertKeyAvailable(teamId, key, excludeProjectId = null) {
  const filter = { team: teamId, key };
  if (excludeProjectId) filter._id = { $ne: excludeProjectId };
  if (await Project.exists(filter)) throw keyConflict(key);
}

/** Saves a project, mapping a race on the unique (team, key) index to the friendly 409. */
async function saveProject(project) {
  try {
    return await project.save();
  } catch (error) {
    if (error.code === 11000) throw keyConflict(project.key);
    throw error;
  }
}

export async function listProjects(user, { search, team, status }) {
  const memberships = await getMemberships(user._id);
  if (team && !memberships.has(team)) {
    throw ApiError.forbidden('You are not a member of this team');
  }

  const teamIds = team ? [team] : [...memberships.keys()];
  if (!teamIds.length) return [];

  const filter = { team: { $in: teamIds } };
  if (status !== 'all') filter.status = status;
  if (search) {
    const pattern = containsRegex(search);
    filter.$or = [{ name: pattern }, { key: pattern }, { description: pattern }];
  }

  // Most recently active first: task and comment work counts, not only edits of the project.
  const projects = await Project.find(filter).sort({ lastActivityAt: -1, _id: -1 });
  return presentProjects(projects, { roles: memberships });
}

export async function getProject(user, projectId) {
  const { project, team } = await loadProjectForMember(projectId, user._id);
  const [counts] = await Promise.all([
    countTasksByProject([project._id]),
    project.populate({ path: 'createdBy', select: USER_PUBLIC_FIELDS }),
    team.populate(TEAM_POPULATE),
  ]);

  return toProjectResponse(project, {
    team: toTeamResponse(team),
    taskCounts: counts.get(project._id.toString()) ?? emptyTaskCounts(),
    myRole: team.getRole(user._id),
  });
}

export async function createProject(actor, { team: teamId, ...fields }) {
  const team = await loadTeamForMember(teamId, actor._id);
  assertTeamManager(team, actor._id, 'Only team owners and admins can create projects');
  await assertKeyAvailable(team._id, fields.key);

  const project = await saveProject(
    new Project({ ...fields, team: team._id, createdBy: actor._id }),
  );

  const render = await prepareProjectView(project);
  emitToTeam(team._id, SERVER_EVENTS.PROJECT_CREATED, render());
  await recordActivity({
    actor,
    action: ACTIVITY.PROJECT_CREATED,
    team: team._id,
    project: project._id,
    meta: projectSnapshot(project),
  });

  return render(team.getRole(actor._id));
}

export async function updateProject(actor, projectId, changes) {
  const { project, team } = await loadProjectForMember(projectId, actor._id);
  assertTeamManager(team, actor._id, 'Only team owners and admins can edit projects');

  const fields = EDITABLE_FIELDS.filter(
    (field) => changes[field] !== undefined && changes[field] !== project[field],
  );
  if (!fields.length) {
    const render = await prepareProjectView(project);
    return render(team.getRole(actor._id));
  }

  if (fields.includes('key')) await assertKeyAvailable(team._id, changes.key, project._id);

  const loggedChanges = fields
    .filter((field) => LOGGED_CHANGES.includes(field))
    .map((field) => ({ field, from: project[field], to: changes[field] }));
  fields.forEach((field) => project.set(field, changes[field]));
  // Saved with the edit, so the response and the broadcast below already show it.
  project.lastActivityAt = new Date();
  await saveProject(project);

  const render = await prepareProjectView(project);
  emitToTeam(team._id, SERVER_EVENTS.PROJECT_UPDATED, render());
  await recordActivity({
    actor,
    action: ACTIVITY.PROJECT_UPDATED,
    team: team._id,
    project: project._id,
    meta: { ...projectSnapshot(project), fields, changes: loggedChanges },
  });

  return render(team.getRole(actor._id));
}

/**
 * Deletes a project with its tasks, comments, notifications and activity. The deletion itself
 * is logged at team level (`project: null`) so it survives the cascade.
 */
export async function deleteProject(actor, projectId) {
  const { project, team } = await loadProjectForMember(projectId, actor._id);
  assertTeamManager(team, actor._id, 'Only team owners and admins can delete projects');

  await Promise.all([
    Task.deleteMany({ project: project._id }),
    Comment.deleteMany({ project: project._id }),
    bulkDeleteNotifications({ project: project._id }),
    Activity.deleteMany({ project: project._id }),
  ]);
  await project.deleteOne();

  emitToTeam(team._id, SERVER_EVENTS.PROJECT_DELETED, { _id: project._id, teamId: team._id });
  closeProjectRoom(project._id);
  await recordActivity({
    actor,
    action: ACTIVITY.PROJECT_DELETED,
    team: team._id,
    project: null,
    meta: projectSnapshot(project),
  });
}
