import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Project, Task, User } from '../src/models/index.js';
import {
  addComment,
  addMember,
  api,
  archiveProject,
  authHeader,
  closeSockets,
  collectEvents,
  collectEventsFrom,
  connectSocket,
  createProject,
  createTask,
  createTeam,
  createWorkspace,
  expectSuccess,
  flushSocket,
  joinProject,
  MISSING_ID,
  registerUser,
  resetDatabase,
  startRealtimeServer,
  updateTask,
  waitForEvent,
} from './helpers.js';

let server;
let owner;
let admin;
let member;
let outsider;
let team;
let project;

const connect = (user) => connectSocket(server.url, user.token);

/** Connects the users and opens the project board for each of them. */
async function openBoard(...users) {
  const sockets = [];
  for (const user of users) {
    const socket = await connect(user);
    expect(await joinProject(socket, project._id)).toMatchObject({ ok: true });
    sockets.push(socket);
  }
  // Make sure the presence broadcasts of these joins have been delivered before the test acts.
  await Promise.all(sockets.map(flushSocket));
  return sockets;
}

const userIds = (users) => users.map((user) => user._id);

/** Ids of a user's notifications about a task, sorted. */
async function notificationIds(user, task) {
  const res = await api.get('/api/notifications').set(authHeader(user));
  return expectSuccess(res)
    .filter((notification) => notification.task === task._id)
    .map((notification) => notification._id)
    .sort();
}

/** The server-side socket of a client socket. */
const serverSocket = (socket) => server.io.of('/').sockets.get(socket.id);

/**
 * Holds the next `project:join` membership check (its project lookup) until `release()` is
 * called, so the test controls what the server handles while the join is pending.
 */
function holdNextMembershipCheck() {
  let release;
  const released = new Promise((resolve) => {
    release = resolve;
  });
  const findById = Project.findById.bind(Project);
  vi.spyOn(Project, 'findById').mockImplementationOnce(async (...args) => {
    await released;
    return findById(...args);
  });
  return release;
}

beforeAll(async () => {
  server = await startRealtimeServer();
});

afterAll(async () => {
  await server?.close();
});

beforeEach(async () => {
  await resetDatabase();
  ({ owner, admin, member, outsider, team, project } = await createWorkspace());
});

afterEach(() => {
  vi.restoreAllMocks();
  closeSockets();
});

describe('socket authentication', () => {
  it('rejects a connection without a token', async () => {
    await expect(connectSocket(server.url)).rejects.toThrow('Authentication required');
  });

  it('rejects an invalid token and the token of a deleted account', async () => {
    const ghost = await registerUser();
    await User.deleteOne({ _id: ghost._id });

    await expect(connectSocket(server.url, 'garbage')).rejects.toThrow('Invalid or expired token');
    await expect(connect(ghost)).rejects.toThrow('Invalid or expired token');
  });

  it('ends open sockets on a password change and only accepts the new token', async () => {
    const [firstTab, secondTab] = [await connect(member), await connect(member)];
    const closed = (socket) => new Promise((resolve) => socket.once('disconnect', resolve));
    const closedTabs = Promise.all([closed(firstTab), closed(secondTab)]);

    const res = await api
      .patch('/api/auth/me/password')
      .set(authHeader(member))
      .send({ currentPassword: member.password, newPassword: 'NewSecret456' });
    const { token } = expectSuccess(res);

    expect(await closedTabs).toEqual(['io server disconnect', 'io server disconnect']);
    await expect(connect(member)).rejects.toThrow('Invalid or expired token');
    const reconnected = await connectSocket(server.url, token);
    expect(serverSocket(reconnected).data.user).not.toHaveProperty('tokenVersion');
  });

  it('puts an authenticated socket in its personal room and its team rooms', async () => {
    const socket = await connect(member);

    const { rooms } = server.io.of('/').sockets.get(socket.id);
    expect([...rooms]).toEqual(
      expect.arrayContaining([`user:${member._id}`, `team:${team._id}`]),
    );
  });
});

describe('project rooms and presence', () => {
  it('lets team members join a project and tells them who is viewing it', async () => {
    const [memberSocket, ownerSocket] = [await connect(member), await connect(owner)];

    const first = await joinProject(memberSocket, project._id);
    const second = await joinProject(ownerSocket, project._id);

    expect(first).toEqual({ ok: true, users: [expect.objectContaining({ _id: member._id })] });
    expect(second.ok).toBe(true);
    expect(userIds(second.users)).toEqual([member._id, owner._id]);
    expect(second.users[0]).toEqual({
      _id: member._id,
      name: 'Mia Member',
      email: member.email,
      title: '',
      avatarColor: member.avatarColor,
    });
  });

  it('refuses outsiders, unknown projects and malformed ids', async () => {
    const socket = await connect(outsider);

    expect(await joinProject(socket, project._id)).toEqual({
      ok: false,
      message: 'You do not have access to this project',
    });
    expect(await joinProject(socket, MISSING_ID)).toEqual({
      ok: false,
      message: 'Project not found',
    });
    expect(await joinProject(socket, 'not-an-id')).toEqual({
      ok: false,
      message: 'Invalid project id',
    });
  });

  it('broadcasts presence when people join, leave and disconnect', async () => {
    const [ownerSocket] = await openBoard(owner);
    const memberSocket = await connect(member);
    const presence = (count) =>
      waitForEvent(ownerSocket, 'presence:update', ({ users }) => users.length === count);

    const joined = presence(2);
    await joinProject(memberSocket, project._id);
    expect(await joined).toEqual({
      projectId: project._id,
      users: [
        expect.objectContaining({ _id: owner._id }),
        expect.objectContaining({ _id: member._id }),
      ],
    });

    const left = presence(1);
    memberSocket.emit('project:leave', project._id);
    expect(userIds((await left).users)).toEqual([owner._id]);

    const rejoined = presence(2);
    await joinProject(memberSocket, project._id);
    await rejoined;
    const disconnected = presence(1);
    memberSocket.disconnect();
    expect(userIds((await disconnected).users)).toEqual([owner._id]);
  });

  it('advertises a heartbeat that drops dead connections within ~15 s', async () => {
    // Clients read the heartbeat from the Engine.IO handshake (open packet "0" + JSON): a ping
    // every 10 s, answered within 5 s (Socket.IO's defaults allow 25 s + 20 s). A dead
    // connection, and the presence it holds, is closed by the server once that time has passed.
    const res = await fetch(`${server.url}/socket.io/?EIO=4&transport=polling`);
    const handshake = JSON.parse((await res.text()).slice(1));

    expect(handshake).toMatchObject({ pingInterval: 10_000, pingTimeout: 5_000 });
  });

  it('drops a join when the board is left while membership is being checked', async () => {
    const [ownerSocket] = await openBoard(owner);
    const memberSocket = await connect(member);

    const presenceUpdates = await collectEvents(ownerSocket, 'presence:update', async () => {
      const release = holdNextMembershipCheck();
      const joining = joinProject(memberSocket, project._id);
      memberSocket.emit('project:leave', project._id); // e.g. navigated away at once
      await flushSocket(memberSocket); // the server has handled the leave
      release();
      expect(await joining).toEqual({
        ok: false,
        message: 'Left the project before the join completed',
      });
    });

    expect(presenceUpdates).toEqual([]);
    expect(serverSocket(memberSocket).rooms.has(`project:${project._id}`)).toBe(false);
    const missed = await collectEvents(memberSocket, 'task:created', () =>
      createTask(owner, project),
    );
    expect(missed).toEqual([]);
    const viewers = await joinProject(await connect(admin), project._id);
    expect(userIds(viewers.users)).toEqual([owner._id, admin._id]);
  });

  it('stays on the board after join -> leave -> join (React StrictMode effects)', async () => {
    await openBoard(owner);
    const memberSocket = await connect(member);

    const release = holdNextMembershipCheck();
    const firstJoin = joinProject(memberSocket, project._id);
    memberSocket.emit('project:leave', project._id);
    const secondJoin = joinProject(memberSocket, project._id);
    expect(await secondJoin).toMatchObject({ ok: true });
    release();
    expect(await firstJoin).toMatchObject({ ok: true });

    const created = waitForEvent(memberSocket, 'task:created');
    const task = await createTask(owner, project);
    expect((await created)._id).toBe(task._id);
    const viewers = await joinProject(await connect(admin), project._id);
    expect(userIds(viewers.users)).toEqual([owner._id, member._id, admin._id]);
  });

  it('counts a user with several open tabs once', async () => {
    const [ownerSocket, firstTab, secondTab] = await openBoard(owner, member, member);

    // Closing one of two tabs keeps the user present: no presence change is broadcast.
    const updates = await collectEvents(ownerSocket, 'presence:update', async () => {
      firstTab.emit('project:leave', project._id);
      await flushSocket(firstTab); // the server handles a socket's events in order
    });
    expect(updates).toEqual([]);

    const gone = waitForEvent(ownerSocket, 'presence:update', ({ users }) => users.length === 1);
    secondTab.disconnect();
    expect(userIds((await gone).users)).toEqual([owner._id]);
  });
});

describe('board events', () => {
  it('pushes task creation, moves and deletion to everyone viewing the project', async () => {
    const [ownerSocket, memberSocket] = await openBoard(owner, member);

    const created = waitForEvent(memberSocket, 'task:created');
    const echoed = waitForEvent(ownerSocket, 'task:created');
    const task = await createTask(owner, project, { title: 'Live task' });
    expect(await created).toEqual(task);
    expect(await echoed).toEqual(task);

    const updated = waitForEvent(memberSocket, 'task:updated', ({ _id }) => _id === task._id);
    const res = await api
      .patch(`/api/tasks/${task._id}/move`)
      .set(authHeader(owner))
      .send({ status: 'in_progress' });
    expect(await updated).toEqual(expectSuccess(res).task);

    const deleted = waitForEvent(memberSocket, 'task:deleted');
    expectSuccess(await api.delete(`/api/tasks/${task._id}`).set(authHeader(owner)));
    expect(await deleted).toEqual({ _id: task._id, projectId: project._id });
  });

  it('pushes edits made through the task form', async () => {
    const task = await createTask(owner, project);
    const [memberSocket] = await openBoard(member);

    const updated = waitForEvent(memberSocket, 'task:updated');
    await updateTask(owner, task, { title: 'Renamed', priority: 'urgent' });

    expect(await updated).toMatchObject({ _id: task._id, title: 'Renamed', priority: 'urgent' });
  });

  it('pushes comments together with the new comment count', async () => {
    const task = await createTask(owner, project);
    const [memberSocket] = await openBoard(member);

    const created = waitForEvent(memberSocket, 'comment:created');
    const comment = await addComment(owner, task, 'Looks good');
    expect(await created).toEqual({
      comment,
      taskId: task._id,
      projectId: project._id,
      commentCount: 1,
    });

    const edited = waitForEvent(memberSocket, 'comment:updated');
    await api.patch(`/api/comments/${comment._id}`).set(authHeader(owner)).send({ body: 'Edited' });
    expect(await edited).toMatchObject({ comment: { _id: comment._id, body: 'Edited' } });

    const deleted = waitForEvent(memberSocket, 'comment:deleted');
    await api.delete(`/api/comments/${comment._id}`).set(authHeader(owner));
    expect(await deleted).toEqual({
      _id: comment._id,
      taskId: task._id,
      projectId: project._id,
      commentCount: 0,
    });
  });

  it('announces re-balanced positions to the board', async () => {
    const [a, b, c] = [
      await createTask(member, project),
      await createTask(member, project),
      await createTask(member, project),
    ];
    await Task.updateOne({ _id: b._id }, { position: a.position + 1e-7 });
    const [ownerSocket] = await openBoard(owner);

    const reordered = waitForEvent(ownerSocket, 'tasks:reordered');
    await api
      .patch(`/api/tasks/${c._id}/move`)
      .set(authHeader(member))
      .send({ status: 'todo', prevTaskId: a._id, nextTaskId: b._id });

    expect(await reordered).toEqual({
      projectId: project._id,
      positions: [{ _id: b._id, position: 2048 }],
    });
  });

  it('only delivers project events to sockets that joined the project', async () => {
    const memberSocket = await connect(member); // connected, but the board is not open
    const outsiderSocket = await connect(outsider);
    await joinProject(outsiderSocket, project._id); // refused

    const delivered = await collectEvents(memberSocket, 'task:created', async () => {
      const leaked = await collectEvents(outsiderSocket, 'task:created', () =>
        createTask(owner, project),
      );
      expect(leaked).toEqual([]);
    });

    expect(delivered).toEqual([]);
  });
});

describe('team and personal rooms', () => {
  it('sends activity to every team member and notifications to their recipient', async () => {
    const [adminSocket, memberSocket] = [await connect(admin), await connect(member)];

    const isTaskCreated = ({ action }) => action === 'task.created';
    const activity = waitForEvent(adminSocket, 'activity:created', isTaskCreated);
    const notification = waitForEvent(memberSocket, 'notification:created');
    const task = await createTask(owner, project, { title: 'Assigned', assignee: member._id });

    expect(await activity).toMatchObject({
      action: 'task.created',
      actor: { _id: owner._id, name: 'Olivia Owner' },
      team: team._id,
      task: task._id,
      meta: { taskKey: 'WEB-1' },
    });
    expect(await notification).toMatchObject({
      type: 'task_assigned',
      recipient: member._id,
      message: 'Olivia Owner assigned you WEB-1: Assigned',
      project: { key: 'WEB' },
    });
  });

  it('keeps activity inside the team and notifications private', async () => {
    const [adminSocket, outsiderSocket] = [await connect(admin), await connect(outsider)];
    const assignToMember = () => createTask(owner, project, { assignee: member._id });

    const leakedActivity = await collectEvents(outsiderSocket, 'activity:created', assignToMember);
    const othersNotifications = await collectEvents(
      adminSocket,
      'notification:created',
      assignToMember,
    );

    expect(leakedActivity).toEqual([]);
    expect(othersNotifications).toEqual([]);
  });

  it("syncs notification reads and deletions to the recipient's tabs only", async () => {
    await createTask(owner, project, { title: 'Assigned', assignee: member._id });
    const [firstTab, secondTab, adminSocket] = [
      await connect(member),
      await connect(member),
      await connect(admin),
    ];
    const asMember = (req) => req.set(authHeader(member));
    const [latest, older] = expectSuccess(await asMember(api.get('/api/notifications')));
    const markRead = () => asMember(api.patch(`/api/notifications/${latest._id}/read`));
    const readAll = () => asMember(api.patch('/api/notifications/read-all'));

    const leaked = await collectEvents(adminSocket, 'notification:read', async () => {
      const synced = waitForEvent(secondTab, 'notification:read');
      const echoed = waitForEvent(firstTab, 'notification:read');
      const { readAt } = expectSuccess(await markRead());
      expect(await synced).toEqual({ _id: latest._id, readAt });
      expect(await echoed).toEqual({ _id: latest._id, readAt });
    });
    expect(leaked).toEqual([]);
    // Nothing changes the second time, so nothing is sent.
    expect(await collectEvents(secondTab, 'notification:read', markRead)).toEqual([]);

    const allRead = waitForEvent(secondTab, 'notifications:read_all');
    expect(expectSuccess(await readAll())).toEqual({ updated: 1 });
    expect(await allRead).toEqual({ readAt: expect.any(String) });
    expect(await collectEvents(secondTab, 'notifications:read_all', readAll)).toEqual([]);

    const deleted = waitForEvent(secondTab, 'notification:deleted');
    expectSuccess(await asMember(api.delete(`/api/notifications/${older._id}`)));
    expect(await deleted).toEqual({ _id: older._id });
  });

  it('removes the notifications of a deleted task from their recipients', async () => {
    const task = await createTask(owner, project, { assignee: member._id });
    await addComment(admin, task); // notifies the assignee (member) and the creator (owner)
    await createTask(owner, project, { assignee: member._id }); // stays, with its notification
    const [memberIds, ownerIds] = [
      await notificationIds(member, task),
      await notificationIds(owner, task),
    ];
    expect([memberIds.length, ownerIds.length]).toEqual([2, 1]);
    const sockets = [await connect(member), await connect(owner), await connect(admin)];

    const [toMember, toOwner, toAdmin] = await collectEventsFrom(
      sockets,
      'notification:deleted',
      async () => expectSuccess(await api.delete(`/api/tasks/${task._id}`).set(authHeader(owner))),
    );

    expect(toMember.map(({ _id }) => _id).sort()).toEqual(memberIds);
    expect(toOwner).toEqual([{ _id: ownerIds[0] }]);
    expect(toAdmin).toEqual([]);
  });

  it('asks each recipient once to refetch notifications when a project is deleted', async () => {
    const task = await createTask(owner, project, { assignee: member._id });
    await addComment(admin, task); // member: assigned + commented, owner: commented
    // The admin's only notification (being added to the team) is not about the project.
    const sockets = [await connect(member), await connect(owner), await connect(admin)];

    const received = await collectEventsFrom(sockets, 'notifications:refresh', async () =>
      expectSuccess(await api.delete(`/api/projects/${project._id}`).set(authHeader(owner))),
    );

    expect(received).toEqual([[{}], [{}], []]);
  });

  it('asks each recipient once to refetch notifications when a team is deleted', async () => {
    await createTask(owner, project, { assignee: member._id });
    // The outsider only has a notification from another team.
    await addMember(owner, await createTeam(owner), outsider);
    const sockets = [await connect(member), await connect(admin), await connect(outsider)];

    const received = await collectEventsFrom(sockets, 'notifications:refresh', async () =>
      expectSuccess(await api.delete(`/api/teams/${team._id}`).set(authHeader(owner))),
    );

    // The member lost team and task notifications, the admin team ones: one refresh each.
    expect(received).toEqual([[{}], [{}], []]);
  });

  it('broadcasts project and team changes to the team room', async () => {
    const memberSocket = await connect(member);

    const projectUpdated = waitForEvent(memberSocket, 'project:updated');
    await archiveProject(owner, project);
    const archived = await projectUpdated;
    expect(archived).toMatchObject({ _id: project._id, status: 'archived' });
    expect(archived).not.toHaveProperty('myRole');

    const projectDeleted = waitForEvent(memberSocket, 'project:deleted');
    await api.delete(`/api/projects/${project._id}`).set(authHeader(owner));
    expect(await projectDeleted).toEqual({ _id: project._id, teamId: team._id });

    const teamUpdated = waitForEvent(memberSocket, 'team:updated');
    await api.patch(`/api/teams/${team._id}`).set(authHeader(owner)).send({ name: 'Platform' });
    const renamed = await teamUpdated;
    expect(renamed).toMatchObject({ _id: team._id, name: 'Platform', projectCount: 0 });
    expect(renamed).not.toHaveProperty('myRole');

    const teamDeleted = waitForEvent(memberSocket, 'team:deleted');
    await api.delete(`/api/teams/${team._id}`).set(authHeader(owner));
    expect(await teamDeleted).toEqual({ _id: team._id });
  });

  it("subscribes a new member's open sockets to the team room", async () => {
    const newcomer = await registerUser({ name: 'Nina Newcomer' });
    const socket = await connect(newcomer); // not in any team yet

    const added = waitForEvent(socket, 'team:added');
    const notified = waitForEvent(socket, 'notification:created');
    await addMember(owner, team, newcomer);

    expect(await added).toMatchObject({
      _id: team._id,
      name: 'Product Engineering',
      myRole: 'member',
    });
    expect(await notified).toMatchObject({
      type: 'team_member_added',
      message: 'Olivia Owner added you to the team Product Engineering',
    });

    // Later team events arrive without reconnecting, and the team's boards can be opened.
    const projectCreated = waitForEvent(socket, 'project:created');
    const created = await createProject(owner, team, { name: 'Mobile App', key: 'MOB' });
    expect(await projectCreated).toMatchObject({ _id: created._id, key: 'MOB' });
    expect(await joinProject(socket, created._id)).toMatchObject({ ok: true });
  });

  it('cuts a removed member off from the team and its project rooms', async () => {
    const task = await createTask(owner, project, { assignee: member._id });
    const [ownerSocket, memberSocket] = await openBoard(owner, member);

    const removed = waitForEvent(memberSocket, 'team:removed');
    const refresh = waitForEvent(ownerSocket, 'tasks:refresh');
    const presence = waitForEvent(ownerSocket, 'presence:update');
    expectSuccess(
      await api.delete(`/api/teams/${team._id}/members/${member._id}`).set(authHeader(owner)),
    );

    expect(await removed).toEqual({ teamId: team._id, teamName: 'Product Engineering' });
    // Their tasks were unassigned, and they no longer appear on the board.
    expect(await refresh).toEqual({ projectId: project._id });
    expect(userIds((await presence).users)).toEqual([owner._id]);

    const missedTaskEvents = await collectEvents(memberSocket, 'task:updated', () =>
      updateTask(owner, task, { title: 'Renamed after removal' }),
    );
    const missedActivity = await collectEvents(memberSocket, 'activity:created', () =>
      createTask(owner, project),
    );
    expect(missedTaskEvents).toEqual([]);
    expect(missedActivity).toEqual([]);
    expect(await joinProject(memberSocket, project._id)).toMatchObject({ ok: false });
  });
});

describe('profile edits', () => {
  const editProfile = async (user, changes) =>
    expectSuccess(await api.patch('/api/auth/me').set(authHeader(user)).send(changes)).user;

  const renamedMember = () => ({
    _id: member._id,
    name: 'Mia Martin',
    email: member.email,
    title: '',
    avatarColor: '#22c55e',
  });

  it("pushes the new profile to teammates and the user's other tabs, once each", async () => {
    // Sharing a second team with the member must not duplicate the event.
    await addMember(owner, await createTeam(owner), member);
    const sockets = [await connect(owner), await connect(member), await connect(outsider)];

    const received = await collectEventsFrom(sockets, 'user:updated', () =>
      editProfile(member, { name: 'Mia Martin', avatarColor: '#22C55E' }),
    );
    expect(received).toEqual([[renamedMember()], [renamedMember()], []]);

    // Someone without a team still gets their own other tabs updated.
    const solo = await collectEventsFrom(sockets, 'user:updated', () =>
      editProfile(outsider, { title: 'Freelancer' }),
    );
    expect(solo).toEqual([[], [], [expect.objectContaining({ title: 'Freelancer' })]]);
  });

  it('sends nothing when the saved values are unchanged', async () => {
    const sockets = [await connect(owner), await connect(member)];

    const received = await collectEventsFrom(sockets, 'user:updated', () =>
      editProfile(member, { name: 'Mia Member', title: '' }),
    );

    expect(received).toEqual([[], []]);
  });

  it('shows the new profile in presence lists, including boards joined later', async () => {
    const [ownerSocket, memberSocket] = await openBoard(owner, member);

    const presence = waitForEvent(ownerSocket, 'presence:update', ({ users }) =>
      users.some(({ name }) => name === 'Mia Martin'),
    );
    await editProfile(member, { name: 'Mia Martin', avatarColor: '#22c55e' });
    expect(await presence).toEqual({
      projectId: project._id,
      users: [expect.objectContaining({ _id: owner._id }), renamedMember()],
    });

    // The member's socket carries the new profile to the next board it opens...
    const otherProject = await createProject(owner, team);
    expect(await joinProject(memberSocket, otherProject._id)).toEqual({
      ok: true,
      users: [renamedMember()],
    });
    // ...and people who open the board afterwards see it too.
    const { users } = await joinProject(await connect(admin), project._id);
    expect(users.map(({ name }) => name)).toEqual(['Olivia Owner', 'Mia Martin', 'Adam Admin']);
  });
});
