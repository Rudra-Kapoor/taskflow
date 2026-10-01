import { beforeEach, describe, expect, it } from 'vitest';
import { sendDueReminders } from '../src/jobs/dueReminders.js';
import { Activity } from '../src/models/index.js';
import {
  addComment,
  api,
  archiveProject,
  authHeader,
  createProject,
  createTask,
  createTeam,
  createWorkspace,
  errorFields,
  expectError,
  expectSuccess,
  registerUser,
  resetDatabase,
  updateTask,
} from './helpers.js';

const HOUR = 60 * 60 * 1000;

let owner;
let admin;
let member;
let outsider;
let team;
let project;

beforeEach(async () => {
  await resetDatabase();
  ({ owner, admin, member, outsider, team, project } = await createWorkspace());
});

/* ------------------------------------------------------------------------------------------ */
/* Notifications                                                                              */
/* ------------------------------------------------------------------------------------------ */

async function listNotifications(user, query = {}) {
  const res = await api.get('/api/notifications').query(query).set(authHeader(user));
  return { notifications: expectSuccess(res), meta: res.body.meta };
}

const notificationsOf = async (user, type) =>
  (await listNotifications(user)).notifications.filter((n) => n.type === type);

const messagesOf = async (user, type) => (await notificationsOf(user, type)).map((n) => n.message);

const markRead = (user, notification) =>
  api.patch(`/api/notifications/${notification._id}/read`).set(authHeader(user));

const deleteNotification = (user, notification) =>
  api.delete(`/api/notifications/${notification._id}`).set(authHeader(user));

describe('notifications', () => {
  it('notifies the assignee of a new task, never the user who assigned it', async () => {
    const task = await createTask(owner, project, {
      title: 'Implement login page',
      assignee: member._id,
    });

    expect(await notificationsOf(member, 'task_assigned')).toEqual([
      {
        _id: expect.any(String),
        recipient: member._id,
        actor: expect.objectContaining({ _id: owner._id, name: 'Olivia Owner' }),
        type: 'task_assigned',
        message: 'Olivia Owner assigned you WEB-1: Implement login page',
        team: team._id,
        project: { _id: project._id, name: 'TaskFlow Web App', key: 'WEB', color: '#6366f1' },
        task: task._id,
        read: false,
        readAt: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ]);
    expect(await notificationsOf(owner, 'task_assigned')).toEqual([]);
  });

  it('notifies the new assignee when a task is reassigned, but not self-assignments', async () => {
    const task = await createTask(owner, project, { title: 'Write docs', assignee: member._id });
    await createTask(admin, project, { title: 'My own task', assignee: admin._id });

    await updateTask(owner, task, { assignee: admin._id });

    expect(await messagesOf(admin, 'task_assigned')).toEqual([
      'Olivia Owner assigned you WEB-1: Write docs',
    ]);
  });

  it('notifies the assignee and the creator of status changes, but not the actor', async () => {
    const task = await createTask(owner, project, { title: 'Ship it', assignee: member._id });

    await updateTask(admin, task, { status: 'in_progress' });
    const moved = await api
      .patch(`/api/tasks/${task._id}/move`)
      .set(authHeader(member))
      .send({ status: 'completed' });
    expectSuccess(moved);

    expect(await messagesOf(owner, 'task_status_changed')).toEqual([
      'Mia Member moved WEB-1: Ship it to Completed',
      'Adam Admin moved WEB-1: Ship it to In Progress',
    ]);
    expect(await messagesOf(member, 'task_status_changed')).toEqual([
      'Adam Admin moved WEB-1: Ship it to In Progress',
    ]);
    expect(await messagesOf(admin, 'task_status_changed')).toEqual([]);
  });

  it('notifies the assignee and the creator about comments, but not the commenter', async () => {
    const task = await createTask(owner, project, { title: 'Review PR', assignee: member._id });

    await addComment(member, task);
    await addComment(admin, task);

    expect(await messagesOf(owner, 'task_commented')).toEqual([
      'Adam Admin commented on WEB-1: Review PR',
      'Mia Member commented on WEB-1: Review PR',
    ]);
    expect(await messagesOf(member, 'task_commented')).toEqual([
      'Adam Admin commented on WEB-1: Review PR',
    ]);
    expect(await messagesOf(admin, 'task_commented')).toEqual([]);
  });

  it('notifies people who are added to a team', async () => {
    const [notification] = await notificationsOf(member, 'team_member_added');

    expect(notification).toMatchObject({
      actor: { _id: owner._id },
      message: 'Olivia Owner added you to the team Product Engineering',
      team: team._id,
      project: null,
      task: null,
    });
  });

  it('lists notifications newest first with page meta and the unread count', async () => {
    for (const title of ['First', 'Second', 'Third']) {
      await createTask(owner, project, { title, assignee: member._id });
    }

    const { notifications, meta } = await listNotifications(member, { limit: 3 });

    expect(notifications.map((n) => n.message)).toEqual([
      'Olivia Owner assigned you WEB-3: Third',
      'Olivia Owner assigned you WEB-2: Second',
      'Olivia Owner assigned you WEB-1: First',
    ]);
    expect(meta).toEqual({ page: 1, limit: 3, total: 4, totalPages: 2, unreadCount: 4 });
  });

  it('marks one notification as read', async () => {
    await createTask(owner, project, { assignee: member._id });
    const [latest] = (await listNotifications(member)).notifications;

    const read = expectSuccess(await markRead(member, latest));

    expect(read).toMatchObject({ _id: latest._id, read: true, readAt: expect.any(String) });
    const unread = await listNotifications(member, { unread: 'true' });
    expect(unread.notifications.map((n) => n._id)).not.toContain(latest._id);
    expect(unread.meta.unreadCount).toBe(1);
  });

  it('marks every notification as read', async () => {
    await createTask(owner, project, { assignee: member._id });
    const readAll = () => api.patch('/api/notifications/read-all').set(authHeader(member));

    expect(expectSuccess(await readAll())).toEqual({ updated: 2 });
    expect(expectSuccess(await readAll())).toEqual({ updated: 0 });
    const { notifications, meta } = await listNotifications(member, { unread: 'true' });
    expect(notifications).toEqual([]);
    expect(meta.unreadCount).toBe(0);
  });

  it('deletes a notification', async () => {
    const [notification] = (await listNotifications(member)).notifications;

    const res = await deleteNotification(member, notification);

    expect(res.body).toEqual({ success: true, message: 'Notification deleted' });
    expect((await listNotifications(member)).notifications).toEqual([]);
    expectError(await deleteNotification(member, notification), 404);
  });

  it("answers 404 when someone touches another user's notification", async () => {
    const [notification] = (await listNotifications(member)).notifications;

    expectError(await markRead(owner, notification), 404, 'Notification not found');
    expectError(await deleteNotification(owner, notification), 404, 'Notification not found');
    expect((await listNotifications(member)).meta.unreadCount).toBe(1);
  });

  it('validates the query', async () => {
    const res = await api
      .get('/api/notifications')
      .query({ unread: 'maybe', page: 0 })
      .set(authHeader(member));

    expectError(res, 400);
    expect(errorFields(res).sort()).toEqual(['page', 'unread']);
  });
});

/* ------------------------------------------------------------------------------------------ */
/* Activity log                                                                               */
/* ------------------------------------------------------------------------------------------ */

async function listActivity(path, user = member, query = {}) {
  const res = await api.get(path).query(query).set(authHeader(user));
  return { entries: expectSuccess(res), meta: res.body.meta };
}

const projectActivity = (query) =>
  listActivity(`/api/projects/${project._id}/activity`, member, query);

/** The newest entry of the project with the given action. */
const latestEntry = async (action) =>
  (await projectActivity({ limit: 50 })).entries.find((entry) => entry.action === action);

/** Follows `nextCursor` until `hasMore` is false and returns every page. */
async function walkPages(path, limit) {
  const pages = [];
  let before;
  for (;;) {
    const page = await listActivity(path, member, { limit, before });
    pages.push(page);
    if (!page.meta.hasMore) return pages;
    before = page.meta.nextCursor;
  }
}

const taskSnapshot = (taskKey, taskTitle) => ({
  projectName: 'TaskFlow Web App',
  projectKey: 'WEB',
  taskKey,
  taskTitle,
});

describe('activity log', () => {
  it('records task creation with a snapshot of the task', async () => {
    const task = await createTask(member, project, { title: 'Implement login page' });

    expect(await latestEntry('task.created')).toEqual({
      _id: expect.any(String),
      actor: expect.objectContaining({ _id: member._id, name: 'Mia Member' }),
      action: 'task.created',
      team: team._id,
      project: project._id,
      task: task._id,
      meta: { ...taskSnapshot('WEB-1', 'Implement login page'), status: 'todo' },
      createdAt: expect.any(String),
    });
  });

  it('records status changes with the previous and the new status', async () => {
    const task = await createTask(member, project, { title: 'Ship it' });

    await updateTask(admin, task, { status: 'completed' });

    expect(await latestEntry('task.status_changed')).toMatchObject({
      actor: { _id: admin._id },
      meta: { ...taskSnapshot('WEB-1', 'Ship it'), from: 'todo', to: 'completed' },
    });
  });

  it('records assignments with the previous and the new assignee', async () => {
    const task = await createTask(owner, project, { title: 'Triage', assignee: member._id });

    await updateTask(owner, task, { assignee: admin._id });
    expect((await latestEntry('task.assigned')).meta).toMatchObject({
      from: { _id: member._id, name: 'Mia Member' },
      to: { _id: admin._id, name: 'Adam Admin' },
    });

    await updateTask(owner, task, { assignee: null });
    expect((await latestEntry('task.assigned')).meta).toMatchObject({
      from: { _id: admin._id, name: 'Adam Admin' },
      to: null,
    });
  });

  it('groups detail edits into one task.updated entry that lists the real changes', async () => {
    const task = await createTask(member, project, {
      title: 'Old title',
      priority: 'low',
      labels: ['a'],
    });

    await updateTask(member, task, {
      title: 'New title',
      description: 'A long description that is not copied into the log',
      priority: 'low',
      dueDate: '2030-01-01T00:00:00.000Z',
      labels: ['B'],
    });

    expect((await latestEntry('task.updated')).meta).toEqual({
      ...taskSnapshot('WEB-1', 'New title'),
      changes: [
        { field: 'title', from: 'Old title', to: 'New title' },
        { field: 'description', from: null, to: null },
        { field: 'dueDate', from: null, to: '2030-01-01T00:00:00.000Z' },
        { field: 'labels', from: ['a'], to: ['b'] },
      ],
    });
  });

  it('records comments with a short excerpt', async () => {
    const task = await createTask(member, project, { title: 'Review PR' });
    const comment = await addComment(admin, task, 'Great work! '.repeat(30));

    const { meta } = await latestEntry('comment.added');

    expect(meta).toMatchObject({
      ...taskSnapshot('WEB-1', 'Review PR'),
      commentId: comment._id,
      excerpt: expect.stringMatching(/^Great work! Great work!.*…$/),
    });
    expect(meta.excerpt.length).toBeLessThanOrEqual(120);
  });

  it('records team membership changes', async () => {
    await api
      .patch(`/api/teams/${team._id}/members/${member._id}`)
      .set(authHeader(owner))
      .send({ role: 'admin' });
    await api.delete(`/api/teams/${team._id}/members/${admin._id}`).set(authHeader(owner));
    await api.delete(`/api/teams/${team._id}/members/${member._id}`).set(authHeader(member));

    const { entries } = await listActivity('/api/activity', owner);

    expect(entries.map((entry) => [entry.action, entry.meta])).toEqual([
      [
        'team.member_removed',
        { teamName: team.name, memberId: member._id, memberName: 'Mia Member', left: true },
      ],
      [
        'team.member_removed',
        { teamName: team.name, memberId: admin._id, memberName: 'Adam Admin', left: false },
      ],
      [
        'team.member_role_changed',
        {
          teamName: team.name,
          memberId: member._id,
          memberName: 'Mia Member',
          from: 'member',
          to: 'admin',
        },
      ],
      ['project.created', { projectName: 'TaskFlow Web App', projectKey: 'WEB' }],
      [
        'team.member_added',
        { teamName: team.name, memberId: member._id, memberName: 'Mia Member', role: 'member' },
      ],
      [
        'team.member_added',
        { teamName: team.name, memberId: admin._id, memberName: 'Adam Admin', role: 'admin' },
      ],
      ['team.created', { teamName: team.name }],
    ]);
  });

  it('keeps the history of a deleted task readable', async () => {
    const task = await createTask(member, project, { title: 'Short-lived' });
    await addComment(member, task);

    expectSuccess(await api.delete(`/api/tasks/${task._id}`).set(authHeader(member)));

    const { entries } = await projectActivity();
    const history = entries.filter((entry) => entry.task === task._id);
    expect(history.map((entry) => entry.action)).toEqual([
      'task.deleted',
      'comment.added',
      'task.created',
    ]);
    expect(history[0].meta).toEqual(taskSnapshot('WEB-1', 'Short-lived'));
  });

  it('lists the activity of a single task', async () => {
    const task = await createTask(member, project);
    const other = await createTask(member, project);
    await updateTask(member, task, { status: 'in_progress' });
    await updateTask(member, other, { status: 'completed' });

    const { entries } = await listActivity(`/api/tasks/${task._id}/activity`);

    expect(entries.map((entry) => entry.action)).toEqual(['task.status_changed', 'task.created']);
  });

  it('shows each user only the activity of their own teams', async () => {
    await createTeam(outsider, { name: 'Outsiders' });

    const outsiderFeed = (await listActivity('/api/activity', outsider)).entries;
    const memberFeed = (await listActivity('/api/activity', member)).entries;

    expect(outsiderFeed.map((entry) => entry.meta.teamName)).toEqual(['Outsiders']);
    expect(memberFeed.every((entry) => entry.team === team._id)).toBe(true);
    const res = await api.get(`/api/projects/${project._id}/activity`).set(authHeader(outsider));
    expectError(res, 403);
  });

  it('pages through the activity with a cursor, without gaps or duplicates', async () => {
    for (let i = 0; i < 5; i += 1) {
      const task = await createTask(member, project);
      await updateTask(member, task, { status: 'completed' });
    }
    const path = `/api/projects/${project._id}/activity`;
    const everything = (await listActivity(path, member, { limit: 50 })).entries;

    const pages = await walkPages(path, 4);

    expect(everything).toHaveLength(11);
    expect(pages.map((page) => page.entries.length)).toEqual([4, 4, 3]);
    expect(pages.flatMap((page) => page.entries).map((entry) => entry._id)).toEqual(
      everything.map((entry) => entry._id),
    );
    for (const page of pages.slice(0, -1)) {
      const last = page.entries.at(-1);
      expect(page.meta).toEqual({ hasMore: true, nextCursor: `${last.createdAt}_${last._id}` });
    }
    expect(pages.at(-1).meta).toEqual({ hasMore: false, nextCursor: null });
  });

  describe('with entries recorded in the same millisecond', () => {
    // Several actions can be logged within one millisecond; insert such entries directly.
    const entry = (createdAt, n) => ({
      actor: owner._id,
      action: 'project.updated',
      team: team._id,
      project: project._id,
      meta: { projectName: 'TaskFlow Web App', projectKey: 'WEB', n },
      createdAt: new Date(createdAt),
    });

    beforeEach(async () => {
      await Activity.insertMany([
        entry('2024-01-01T10:00:00.000Z', 1),
        entry('2024-01-01T11:00:00.000Z', 2),
        entry('2024-01-01T11:00:00.000Z', 3),
        entry('2024-01-01T11:00:00.000Z', 4),
        entry('2024-01-01T12:00:00.000Z', 5),
      ]);
    });

    it('never skips or repeats them, and keeps every page at exactly `limit` entries', async () => {
      for (const path of [`/api/projects/${project._id}/activity`, '/api/activity']) {
        const everything = (await listActivity(path, member, { limit: 50 })).entries;

        for (const limit of [1, 2, 3]) {
          const pages = await walkPages(path, limit);
          const ids = pages.flatMap((page) => page.entries).map((item) => item._id);
          expect(ids, `${path}, limit ${limit}`).toEqual(everything.map((item) => item._id));
          for (const page of pages.slice(0, -1)) expect(page.entries).toHaveLength(limit);
        }
      }
    });

    it('still accepts a plain ISO date as the cursor (strictly older entries)', async () => {
      const path = `/api/projects/${project._id}/activity`;
      const olderThan = async (before) =>
        (await listActivity(path, member, { before })).entries.map((item) => item.meta.n);

      expect(await olderThan('2024-01-01T11:00:00.000Z')).toEqual([1]);
      expect(await olderThan('2024-01-01T11:30:00+00:30')).toEqual([1]);
      // Entries of the same millisecond are ordered by _id, newest first.
      expect(await olderThan('2024-01-02')).toEqual([5, 4, 3, 2, 1]);
    });
  });

  it.each([
    'yesterday-ish',
    '2024-13-01T00:00:00.000Z_0123456789abcdef01234567',
    '2024-01-01T00:00:00.000Z_not-an-id',
    '2024-01-01T00:00:00.000Z_0123456789abcdef01234567_extra',
  ])('rejects the invalid cursor %s', async (before) => {
    const res = await api
      .get(`/api/projects/${project._id}/activity`)
      .query({ before })
      .set(authHeader(member));

    expectError(res, 400);
    expect(res.body.errors).toEqual([
      {
        field: 'before',
        location: 'query',
        message: 'before must be a nextCursor value or an ISO date',
      },
    ]);
  });
});

/* ------------------------------------------------------------------------------------------ */
/* Due date reminders                                                                         */
/* ------------------------------------------------------------------------------------------ */

describe('due date reminders (sendDueReminders job)', () => {
  const inHours = (hours, from = Date.now()) => new Date(from + hours * HOUR).toISOString();

  it('notifies the assignee of each open task due within 24 hours, exactly once', async () => {
    const now = new Date();
    const dueSoon = await createTask(owner, project, {
      title: 'Renew TLS certificate',
      assignee: member._id,
      dueDate: inHours(2, now.getTime()),
    });
    // None of these qualify: due later, already overdue, completed, unassigned, archived project.
    const later = { assignee: member._id, dueDate: inHours(30, now.getTime()) };
    const overdue = { assignee: member._id, dueDate: inHours(-1, now.getTime()) };
    const soon = { dueDate: inHours(2, now.getTime()) };
    await createTask(owner, project, later);
    await createTask(owner, project, overdue);
    await createTask(owner, project, { ...soon, assignee: member._id, status: 'completed' });
    await createTask(owner, project, soon);
    const archived = await createProject(owner, team);
    await createTask(owner, archived, { ...soon, assignee: member._id });
    await archiveProject(owner, archived);

    expect(await sendDueReminders(now)).toBe(1);
    expect(await sendDueReminders(now)).toBe(0);

    expect(await notificationsOf(member, 'task_due_soon')).toEqual([
      expect.objectContaining({
        actor: null,
        message: 'WEB-1: Renew TLS certificate is due within 24 hours',
        project: expect.objectContaining({ _id: project._id, key: 'WEB' }),
        task: dueSoon._id,
      }),
    ]);
  });

  it('never sends a reminder twice when runs overlap (e.g. two server instances)', async () => {
    await createTask(owner, project, { assignee: member._id, dueDate: inHours(2) });
    const now = Date.now();

    const sent = await Promise.all([
      sendDueReminders(new Date(now)),
      sendDueReminders(new Date(now + 1)),
    ]);

    expect(sent[0] + sent[1]).toBe(1);
    expect(await notificationsOf(member, 'task_due_soon')).toHaveLength(1);
  });

  it('reminds again once the due date has been changed', async () => {
    const task = await createTask(owner, project, { assignee: member._id, dueDate: inHours(2) });
    expect(await sendDueReminders()).toBe(1);

    await updateTask(owner, task, { dueDate: inHours(5) });

    expect(await sendDueReminders()).toBe(1);
    expect(await notificationsOf(member, 'task_due_soon')).toHaveLength(2);
  });

  it('reminds the new assignee after a reassignment', async () => {
    const task = await createTask(owner, project, { assignee: member._id, dueDate: inHours(2) });
    expect(await sendDueReminders()).toBe(1);

    await updateTask(owner, task, { assignee: admin._id });

    expect(await sendDueReminders()).toBe(1);
    expect(await notificationsOf(admin, 'task_due_soon')).toEqual([
      expect.objectContaining({ task: task._id }),
    ]);
  });

  it('reminds again when a completed task is reopened, in the form or on the board', async () => {
    const task = await createTask(owner, project, { assignee: member._id, dueDate: inHours(2) });
    const move = (status) =>
      api.patch(`/api/tasks/${task._id}/move`).set(authHeader(owner)).send({ status });
    expect(await sendDueReminders()).toBe(1);

    await updateTask(owner, task, { status: 'completed' });
    await updateTask(owner, task, { status: 'in_progress' });
    expect(await sendDueReminders()).toBe(1);

    expectSuccess(await move('completed'));
    expectSuccess(await move('todo'));
    expect(await sendDueReminders()).toBe(1);
    expect(await notificationsOf(member, 'task_due_soon')).toHaveLength(3);
  });

  it('does not remind again after edits that change none of that', async () => {
    const task = await createTask(owner, project, { assignee: member._id, dueDate: inHours(2) });
    expect(await sendDueReminders()).toBe(1);

    await updateTask(owner, task, { title: 'Renamed', priority: 'high', labels: ['ops'] });
    await updateTask(owner, task, { status: 'in_progress' }); // started, not reopened

    expect(await sendDueReminders()).toBe(0);
  });

  it('also reminds people about tasks they assigned to themselves', async () => {
    const solo = await registerUser();
    const soloProject = await createProject(solo, await createTeam(solo));
    await createTask(solo, soloProject, { assignee: solo._id, dueDate: inHours(3) });

    expect(await sendDueReminders()).toBe(1);
    expect(await notificationsOf(solo, 'task_due_soon')).toHaveLength(1);
  });
});
