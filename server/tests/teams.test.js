import { beforeEach, describe, expect, it } from 'vitest';
import { Activity, Comment, Notification, Project, Task, Team } from '../src/models/index.js';
import {
  addComment,
  addMember,
  api,
  authHeader,
  createProject,
  createTask,
  createTeam,
  createWorkspace,
  errorFields,
  expectError,
  expectSuccess,
  MISSING_ID,
  registerUser,
  resetDatabase,
} from './helpers.js';

const getTeam = (user, team) => api.get(`/api/teams/${team._id}`).set(authHeader(user));

const memberRoles = (team) =>
  Object.fromEntries(team.members.map((member) => [member.user.name, member.role]));

const removeMember = (actor, team, user) =>
  api.delete(`/api/teams/${team._id}/members/${user._id}`).set(authHeader(actor));

const changeRole = (actor, team, user, role) =>
  api
    .patch(`/api/teams/${team._id}/members/${user._id}`)
    .set(authHeader(actor))
    .send({ role });

beforeEach(resetDatabase);

describe('POST /api/teams', () => {
  it('creates a team owned by its creator', async () => {
    const owner = await registerUser({ name: 'Olivia Owner' });

    const res = await api
      .post('/api/teams')
      .set(authHeader(owner))
      .send({ name: '  Product Engineering ', description: 'Builds the core product' });

    const team = expectSuccess(res, 201);
    expect(team).toMatchObject({
      name: 'Product Engineering',
      description: 'Builds the core product',
      owner: { _id: owner._id, name: 'Olivia Owner', email: owner.email },
      members: [
        {
          user: { _id: owner._id, name: 'Olivia Owner' },
          role: 'owner',
          joinedAt: expect.any(String),
        },
      ],
      myRole: 'owner',
      projectCount: 0,
    });
    expect(team.owner).not.toHaveProperty('password');
  });

  it('validates the name and requires authentication', async () => {
    const owner = await registerUser();

    const invalid = await api.post('/api/teams').set(authHeader(owner)).send({ name: 'A' });
    const anonymous = await api.post('/api/teams').send({ name: 'Anonymous team' });

    expectError(invalid, 400, 'Validation failed');
    expect(errorFields(invalid)).toEqual(['name']);
    expectError(anonymous, 401);
  });
});

describe('GET /api/teams', () => {
  it("lists only the user's teams, sorted by name, with their role and project count", async () => {
    const [alice, bob] = await Promise.all([registerUser(), registerUser()]);
    await createTeam(alice, { name: 'zeta squad' });
    const alpha = await createTeam(bob, { name: 'Alpha team' });
    await addMember(bob, alpha, alice, 'admin');
    await createProject(bob, alpha);
    await createTeam(bob, { name: 'Bob only' });

    const teams = expectSuccess(await api.get('/api/teams').set(authHeader(alice)));

    const summary = teams.map(({ name, myRole, projectCount }) => ({ name, myRole, projectCount }));
    expect(summary).toEqual([
      { name: 'Alpha team', myRole: 'admin', projectCount: 1 },
      { name: 'zeta squad', myRole: 'owner', projectCount: 0 },
    ]);
  });
});

describe('GET /api/teams/:teamId', () => {
  it('returns the team with populated members and the viewer role', async () => {
    const { member, team } = await createWorkspace();

    const details = expectSuccess(await getTeam(member, team));

    expect(details.myRole).toBe('member');
    expect(memberRoles(details)).toEqual({
      'Olivia Owner': 'owner',
      'Adam Admin': 'admin',
      'Mia Member': 'member',
    });
  });

  it('returns 403 to non-members and 404 for an unknown team', async () => {
    const { outsider, team } = await createWorkspace();

    expectError(await getTeam(outsider, team), 403, 'not a member');
    expectError(await getTeam(outsider, { _id: MISSING_ID }), 404, 'Team not found');
  });
});

describe('PATCH /api/teams/:teamId', () => {
  it('lets owners and admins edit the team details', async () => {
    const { admin, team } = await createWorkspace();

    const res = await api
      .patch(`/api/teams/${team._id}`)
      .set(authHeader(admin))
      .send({ name: 'Platform', description: 'APIs and infrastructure' });

    expect(expectSuccess(res)).toMatchObject({
      name: 'Platform',
      description: 'APIs and infrastructure',
      myRole: 'admin',
    });
  });

  it('forbids plain members and outsiders', async () => {
    const { member, outsider, team } = await createWorkspace();

    for (const user of [member, outsider]) {
      const res = await api
        .patch(`/api/teams/${team._id}`)
        .set(authHeader(user))
        .send({ name: 'Hacked' });
      expectError(res, 403);
    }
    expect(expectSuccess(await getTeam(member, team)).name).toBe('Product Engineering');
  });
});

describe('POST /api/teams/:teamId/members', () => {
  const addByEmail = (actor, team, body) =>
    api.post(`/api/teams/${team._id}/members`).set(authHeader(actor)).send(body);

  it('adds an existing account by email (case-insensitive) as a member by default', async () => {
    const owner = await registerUser({ name: 'Olivia Owner' });
    const bob = await registerUser({ name: 'Bob Builder', email: 'bob@example.com' });
    const team = await createTeam(owner);

    const res = await addByEmail(owner, team, { email: 'BOB@example.com' });

    const updated = expectSuccess(res, 201);
    expect(updated.myRole).toBe('owner');
    expect(memberRoles(updated)).toEqual({ 'Olivia Owner': 'owner', 'Bob Builder': 'member' });
    expect(expectSuccess(await getTeam(bob, team)).myRole).toBe('member');
  });

  it('lets admins add members, but only the owner can add someone as an admin', async () => {
    const { owner, admin, outsider, team } = await createWorkspace();
    const newcomer = await registerUser({ name: 'Nina Newcomer' });

    const adminByAdmin = await addByEmail(admin, team, { email: outsider.email, role: 'admin' });
    const memberByAdmin = await addByEmail(admin, team, { email: newcomer.email });
    const adminByOwner = await addByEmail(owner, team, { email: outsider.email, role: 'admin' });

    expectError(adminByAdmin, 403, 'Only the team owner can add admins');
    expect(memberRoles(expectSuccess(memberByAdmin, 201))['Nina Newcomer']).toBe('member');
    expect(memberRoles(expectSuccess(adminByOwner, 201))['Oscar Outsider']).toBe('admin');
  });

  it('returns 404 when no account exists for the email', async () => {
    const { owner, team } = await createWorkspace();

    const res = await addByEmail(owner, team, { email: 'nobody@example.com' });

    expectError(res, 404, 'No account found for nobody@example.com');
  });

  it('returns 409 when the user is already a member', async () => {
    const { owner, member, team } = await createWorkspace();

    const res = await addByEmail(owner, team, { email: member.email });

    expectError(res, 409, 'already a member');
  });

  it('forbids plain members and outsiders from adding people', async () => {
    const { member, outsider, team } = await createWorkspace();
    const newcomer = await registerUser();

    expectError(await addByEmail(member, team, { email: newcomer.email }), 403);
    expectError(await addByEmail(outsider, team, { email: newcomer.email }), 403);
  });

  it('validates the email and never grants the owner role', async () => {
    const { owner, outsider, team } = await createWorkspace();

    const badEmail = await addByEmail(owner, team, { email: 'not-an-email' });
    const ownerRole = await addByEmail(owner, team, { email: outsider.email, role: 'owner' });

    expectError(badEmail, 400);
    expect(errorFields(badEmail)).toEqual(['email']);
    expectError(ownerRole, 400);
    expect(errorFields(ownerRole)).toEqual(['role']);
  });
});

describe('PATCH /api/teams/:teamId/members/:userId', () => {
  it('lets the owner promote and demote members', async () => {
    const { owner, member, team } = await createWorkspace();

    const promoted = expectSuccess(await changeRole(owner, team, member, 'admin'));
    expect(memberRoles(promoted)['Mia Member']).toBe('admin');

    const demoted = expectSuccess(await changeRole(owner, team, member, 'member'));
    expect(memberRoles(demoted)['Mia Member']).toBe('member');
  });

  it('forbids admins from changing roles', async () => {
    const { admin, member, team } = await createWorkspace();

    expectError(await changeRole(admin, team, member, 'admin'), 403, 'Only the team owner');
  });

  it("refuses to change the owner's role", async () => {
    const { owner, team } = await createWorkspace();

    const res = await changeRole(owner, team, owner, 'member');

    expectError(res, 400, "owner's role cannot be changed");
  });

  it('returns 404 for a user who is not a member', async () => {
    const { owner, outsider, team } = await createWorkspace();

    expectError(await changeRole(owner, team, outsider, 'admin'), 404, 'not a member');
  });
});

describe('DELETE /api/teams/:teamId/members/:userId', () => {
  let workspace;

  beforeEach(async () => {
    workspace = await createWorkspace();
  });

  it('lets an admin remove a plain member', async () => {
    const { admin, member, team } = workspace;

    const res = await removeMember(admin, team, member);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Member removed' });
    expect(Object.keys(memberRoles(expectSuccess(await getTeam(admin, team))))).not.toContain(
      'Mia Member',
    );
    expectError(await getTeam(member, team), 403);
  });

  it('does not let an admin remove another admin or the owner', async () => {
    const { owner, admin, team } = workspace;
    const secondAdmin = await registerUser();
    await addMember(owner, team, secondAdmin, 'admin');

    const res = await removeMember(admin, team, secondAdmin);

    expectError(res, 403, 'Admins can only remove members');
    expectError(await removeMember(admin, team, owner), 403);
  });

  it('lets the owner remove an admin', async () => {
    const { owner, admin, team } = workspace;

    expect((await removeMember(owner, team, admin)).status).toBe(200);
    expectError(await getTeam(admin, team), 403);
  });

  it('does not let a plain member remove anyone else', async () => {
    const { owner, admin, member, team } = workspace;

    expectError(await removeMember(member, team, admin), 403);
    expectError(await removeMember(member, team, owner), 403);
  });

  it('lets a member leave the team, but not the owner', async () => {
    const { owner, member, team } = workspace;

    const left = await removeMember(member, team, member);
    const ownerLeaving = await removeMember(owner, team, owner);

    expect(left.body).toEqual({ success: true, message: 'You left the team' });
    expect(expectSuccess(await api.get('/api/teams').set(authHeader(member)))).toEqual([]);
    expectError(ownerLeaving, 400, 'Delete the team instead');
  });

  it("unassigns the removed member's tasks in the team's projects only", async () => {
    const { owner, member, outsider, team, project } = workspace;
    const task = await createTask(owner, project, { assignee: member._id });
    // The member also works in another team, which must not be affected.
    const otherTeam = await createTeam(outsider);
    await addMember(outsider, otherTeam, member);
    const otherProject = await createProject(outsider, otherTeam);
    const otherTask = await createTask(outsider, otherProject, { assignee: member._id });

    expect((await removeMember(owner, team, member)).status).toBe(200);

    const getTask = (user, { _id }) => api.get(`/api/tasks/${_id}`).set(authHeader(user));
    expect(expectSuccess(await getTask(owner, task)).assignee).toBeNull();
    expect(expectSuccess(await getTask(outsider, otherTask)).assignee._id).toBe(member._id);
  });
});

describe('DELETE /api/teams/:teamId', () => {
  it('can only be done by the owner', async () => {
    const { admin, member, team } = await createWorkspace();

    for (const user of [admin, member]) {
      expectError(await api.delete(`/api/teams/${team._id}`).set(authHeader(user)), 403);
    }
    expectSuccess(await getTeam(admin, team));
  });

  it('deletes its projects, tasks, comments, activity and notifications', async () => {
    const { owner, member, outsider, team, project } = await createWorkspace();
    const task = await createTask(owner, project, { assignee: member._id });
    await addComment(member, task);
    // Another team's data must survive.
    const otherTeam = await createTeam(outsider);
    const otherProject = await createProject(outsider, otherTeam);
    await createTask(outsider, otherProject);

    const res = await api.delete(`/api/teams/${team._id}`).set(authHeader(owner));

    expect(res.body).toEqual({ success: true, message: 'Team deleted' });
    expectError(await getTeam(owner, team), 404);
    const remaining = await Promise.all([
      Team.countDocuments({ _id: team._id }),
      Project.countDocuments({ team: team._id }),
      Task.countDocuments({ project: project._id }),
      Comment.countDocuments({ project: project._id }),
      Activity.countDocuments({ team: team._id }),
      Notification.countDocuments({ team: team._id }),
    ]);
    expect(remaining).toEqual([0, 0, 0, 0, 0, 0]);
    expect(await Task.countDocuments({ project: otherProject._id })).toBe(1);
    expect(await Activity.countDocuments({ team: otherTeam._id })).toBeGreaterThan(0);
  });
});
