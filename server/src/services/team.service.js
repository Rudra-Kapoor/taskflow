import { Activity, Comment, Project, Task, Team, User } from '../models/index.js';
import {
  closeTeamRooms,
  emitToProject,
  emitToTeam,
  emitToUser,
  evictUserFromTeam,
  joinUserToTeam,
} from '../socket/emitter.js';
import { SERVER_EVENTS } from '../socket/events.js';
import { ApiError } from '../utils/ApiError.js';
import { ACTIVITY, NOTIFICATION } from '../utils/constants.js';
import { sameId } from '../utils/query.js';
import { assertTeamManager, loadTeamForMember } from './access.service.js';
import { recordActivity } from './activity.service.js';
import {
  bulkDeleteNotifications,
  createNotifications,
  notificationMessages,
} from './notification.service.js';
import { prepareTeamView, presentTeams } from './serializers.js';

const notAMember = () => ApiError.notFound('This user is not a member of the team');

const assertOwner = (team, userId, message) => {
  if (team.getRole(userId) !== 'owner') throw ApiError.forbidden(message);
};

/** Owners can remove anyone else, admins only plain members, members only themselves. */
const assertCanRemove = (actorRole, memberRole) => {
  if (actorRole === 'owner') return;
  if (actorRole === 'admin') {
    if (memberRole !== 'member') throw ApiError.forbidden('Admins can only remove members');
    return;
  }
  throw ApiError.forbidden('Only team owners and admins can remove members');
};

export async function listTeams(user) {
  const teams = await Team.find({ 'members.user': user._id })
    .collation({ locale: 'en', strength: 2 })
    .sort({ name: 1 });
  return presentTeams(teams, { viewerId: user._id });
}

export async function getTeam(user, teamId) {
  const team = await loadTeamForMember(teamId, user._id);
  const render = await prepareTeamView(team);
  return render(user._id);
}

export async function createTeam(actor, { name, description }) {
  const team = await Team.create({
    name,
    description,
    owner: actor._id,
    members: [{ user: actor._id, role: 'owner' }],
  });

  joinUserToTeam(actor._id, team._id);
  await recordActivity({
    actor,
    action: ACTIVITY.TEAM_CREATED,
    team: team._id,
    meta: { teamName: team.name },
  });

  const render = await prepareTeamView(team);
  return render(actor._id);
}

export async function updateTeam(actor, teamId, changes) {
  const team = await loadTeamForMember(teamId, actor._id);
  assertTeamManager(team, actor._id, 'Only team owners and admins can edit the team');

  const fields = ['name', 'description'].filter(
    (field) => changes[field] !== undefined && changes[field] !== team[field],
  );
  if (fields.length) {
    fields.forEach((field) => team.set(field, changes[field]));
    await team.save();
  }

  const render = await prepareTeamView(team);
  if (fields.length) {
    emitToTeam(team._id, SERVER_EVENTS.TEAM_UPDATED, render());
    await recordActivity({
      actor,
      action: ACTIVITY.TEAM_UPDATED,
      team: team._id,
      meta: { teamName: team.name, fields },
    });
  }
  return render(actor._id);
}

/**
 * Deletes a team with all of its projects, tasks, comments, activity and notifications.
 * A standalone MongoDB has no multi-document transactions, so dependents are removed first:
 * if anything fails midway the team still exists and the delete can simply be retried.
 */
export async function deleteTeam(actor, teamId) {
  const team = await loadTeamForMember(teamId, actor._id);
  assertOwner(team, actor._id, 'Only the team owner can delete the team');

  const projectIds = await Project.find({ team: team._id }).distinct('_id');
  await Promise.all([
    Task.deleteMany({ project: { $in: projectIds } }),
    Comment.deleteMany({ project: { $in: projectIds } }),
    Activity.deleteMany({ team: team._id }),
    bulkDeleteNotifications({ $or: [{ team: team._id }, { project: { $in: projectIds } }] }),
  ]);
  await Project.deleteMany({ team: team._id });
  await team.deleteOne();

  emitToTeam(team._id, SERVER_EVENTS.TEAM_DELETED, { _id: team._id });
  closeTeamRooms(team._id, projectIds);
}

export async function addMember(actor, teamId, { email, role }) {
  const team = await loadTeamForMember(teamId, actor._id);
  assertTeamManager(team, actor._id, 'Only team owners and admins can add members');
  // Like promotions, granting the admin role is the owner's call.
  if (role === 'admin') assertOwner(team, actor._id, 'Only the team owner can add admins');

  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound(`No account found for ${email}. Ask them to sign up first.`);

  const alreadyMember = () => ApiError.conflict(`${user.name} is already a member of this team`);
  if (team.isMember(user._id)) throw alreadyMember();

  // The membership condition makes concurrent requests unable to add the same person twice.
  const updated = await Team.findOneAndUpdate(
    { _id: team._id, 'members.user': { $ne: user._id } },
    { $push: { members: { user: user._id, role, joinedAt: new Date() } } },
    { new: true },
  );
  if (!updated) throw alreadyMember();

  joinUserToTeam(user._id, updated._id);
  const render = await prepareTeamView(updated);
  emitToUser(user._id, SERVER_EVENTS.TEAM_ADDED, render(user._id));
  emitToTeam(updated._id, SERVER_EVENTS.TEAM_UPDATED, render());

  await Promise.all([
    recordActivity({
      actor,
      action: ACTIVITY.MEMBER_ADDED,
      team: updated._id,
      meta: { teamName: updated.name, memberId: user._id, memberName: user.name, role },
    }),
    createNotifications({
      recipients: [user._id],
      actor,
      type: NOTIFICATION.TEAM_MEMBER_ADDED,
      message: notificationMessages.teamMemberAdded(actor.name, updated.name),
      team: updated._id,
    }),
  ]);

  return render(actor._id);
}

export async function updateMemberRole(actor, teamId, memberId, role) {
  const team = await loadTeamForMember(teamId, actor._id);
  assertOwner(team, actor._id, 'Only the team owner can change member roles');

  const member = team.getMember(memberId);
  if (!member) throw notAMember();
  if (member.role === 'owner') throw ApiError.badRequest("The team owner's role cannot be changed");

  if (member.role === role) {
    const render = await prepareTeamView(team);
    return render(actor._id);
  }

  const previousRole = member.role;
  const updated = await Team.findOneAndUpdate(
    { _id: team._id, 'members.user': member.user },
    { $set: { 'members.$.role': role } },
    { new: true },
  );
  if (!updated) throw notAMember();

  const render = await prepareTeamView(updated);
  emitToTeam(updated._id, SERVER_EVENTS.TEAM_UPDATED, render());
  await recordActivity({
    actor,
    action: ACTIVITY.MEMBER_ROLE_CHANGED,
    team: updated._id,
    meta: {
      teamName: updated.name,
      memberId: member.user,
      memberName: updated.getMember(memberId)?.user?.name ?? null,
      from: previousRole,
      to: role,
    },
  });

  return render(actor._id);
}

/**
 * Removes a member (or lets a member leave). Their tasks in the team's projects become
 * unassigned and their open sockets are cut off from the team's rooms.
 *
 * @returns {Promise<{ left: boolean }>} `left` is true when the user removed themselves.
 */
export async function removeMember(actor, teamId, memberId) {
  const team = await loadTeamForMember(teamId, actor._id);
  const member = team.getMember(memberId);
  if (!member) throw notAMember();

  const left = sameId(member.user, actor._id);
  if (left && member.role === 'owner') {
    throw ApiError.badRequest('The team owner cannot leave the team. Delete the team instead.');
  }
  if (!left) assertCanRemove(team.getRole(actor._id), member.role);

  const userId = member.user;
  const updated = await Team.findOneAndUpdate(
    { _id: team._id, 'members.user': userId },
    { $pull: { members: { user: userId } } },
    { new: true },
  );
  if (!updated) throw notAMember();

  const projectIds = await Project.find({ team: team._id }).distinct('_id');
  const affectedProjectIds = await Task.distinct('project', {
    project: { $in: projectIds },
    assignee: userId,
  });
  if (affectedProjectIds.length) {
    await Task.updateMany(
      { project: { $in: affectedProjectIds }, assignee: userId },
      { $set: { assignee: null } },
    );
  }

  evictUserFromTeam(userId, team._id, projectIds);
  for (const projectId of affectedProjectIds) {
    emitToProject(projectId, SERVER_EVENTS.TASKS_REFRESH, { projectId });
  }
  emitToUser(userId, SERVER_EVENTS.TEAM_REMOVED, { teamId: team._id, teamName: team.name });

  const render = await prepareTeamView(updated);
  emitToTeam(team._id, SERVER_EVENTS.TEAM_UPDATED, render());

  const removedUser = await User.findById(userId).select('name').lean();
  await recordActivity({
    actor,
    action: ACTIVITY.MEMBER_REMOVED,
    team: team._id,
    meta: { teamName: team.name, memberId: userId, memberName: removedUser?.name ?? null, left },
  });

  return { left };
}
