import { beforeEach, describe, expect, it } from 'vitest';
import { Activity, Comment, Notification } from '../src/models/index.js';
import {
  addComment,
  api,
  authHeader,
  createProject,
  createTask,
  createWorkspace,
  errorFields,
  expectError,
  expectSuccess,
  MISSING_ID,
  resetDatabase,
  updateTask,
} from './helpers.js';

let owner;
let admin;
let member;
let outsider;
let team;
let project;

const postTask = (user, body, target = project) =>
  api.post(`/api/projects/${target._id}/tasks`).set(authHeader(user)).send(body);

const getTask = (user, task) => api.get(`/api/tasks/${task._id}`).set(authHeader(user));

const patchTask = (user, task, body) =>
  api.patch(`/api/tasks/${task._id}`).set(authHeader(user)).send(body);

const deleteTask = (user, task) => api.delete(`/api/tasks/${task._id}`).set(authHeader(user));

const listBoard = async (user = member) =>
  expectSuccess(await api.get(`/api/projects/${project._id}/tasks`).set(authHeader(user)));

beforeEach(async () => {
  await resetDatabase();
  ({ owner, admin, member, outsider, team, project } = await createWorkspace());
});

describe('POST /api/projects/:projectId/tasks', () => {
  it('applies defaults and returns the populated task', async () => {
    const task = expectSuccess(await postTask(member, { title: '  Write API docs  ' }), 201);

    expect(task).toMatchObject({
      number: 1,
      title: 'Write API docs',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee: null,
      createdBy: { _id: member._id, name: 'Mia Member' },
      dueDate: null,
      labels: [],
      commentCount: 0,
      completedAt: null,
      position: 1024,
      project: { _id: project._id, name: 'TaskFlow Web App', key: 'WEB', team: team._id },
    });
    expect(task).not.toHaveProperty('dueReminderSentAt');
    expect(task).not.toHaveProperty('__v');
  });

  it('numbers tasks sequentially within each project', async () => {
    const other = await createProject(owner, team, { key: 'API' });

    const numbers = [];
    for (const target of [project, project, other, project, other]) {
      numbers.push((await createTask(member, target)).number);
    }

    expect(numbers).toEqual([1, 2, 1, 3, 2]);
  });

  it('appends each new task to the end of its column', async () => {
    const first = await createTask(member, project);
    const second = await createTask(member, project);
    const inProgress = await createTask(member, project, { status: 'in_progress' });

    expect(second.position).toBeGreaterThan(first.position);
    expect(inProgress.position).toBe(1024);
  });

  it('accepts the optional fields and sets completedAt for a completed task', async () => {
    const dueDate = '2030-01-15T18:29:59.999Z';

    const task = await createTask(owner, project, {
      title: 'Ship it',
      description: 'Release to production',
      status: 'completed',
      priority: 'urgent',
      assignee: admin._id,
      dueDate,
    });

    expect(task).toMatchObject({
      description: 'Release to production',
      status: 'completed',
      priority: 'urgent',
      assignee: { _id: admin._id, name: 'Adam Admin' },
      dueDate,
      completedAt: expect.any(String),
    });
  });

  it("only accepts assignees from the project's team", async () => {
    const res = await postTask(owner, { title: 'Pair up', assignee: outsider._id });

    expectError(res, 400, "Assignee must be a member of this project's team");
    expect(res.body.errors).toEqual([
      expect.objectContaining({ field: 'assignee', location: 'body' }),
    ]);
  });

  it('trims, lower-cases and de-duplicates labels', async () => {
    const task = await createTask(member, project, { labels: ['Frontend', ' auth ', 'frontend'] });

    expect(task.labels).toEqual(['frontend', 'auth']);
  });

  it('allows at most 10 distinct labels', async () => {
    const tenLabels = Array.from({ length: 10 }, (_, i) => `label-${i}`);

    const tooMany = await postTask(member, { title: 'Busy', labels: [...tenLabels, 'eleven'] });
    const duplicates = await postTask(member, { title: 'Busy', labels: [...tenLabels, 'LABEL-0'] });

    expectError(tooMany, 400);
    expect(errorFields(tooMany)).toEqual(['labels']);
    expect(expectSuccess(duplicates, 201).labels).toHaveLength(10);
  });

  it('reports every invalid field', async () => {
    const res = await postTask(member, {
      title: '',
      status: 'blocked',
      priority: 'critical',
      dueDate: 'not-a-date',
      labels: ['x'.repeat(31)],
    });

    expectError(res, 400, 'Validation failed');
    expect(errorFields(res).sort()).toEqual(['dueDate', 'labels.0', 'priority', 'status', 'title']);
  });

  it('forbids users outside the team and reports unknown projects', async () => {
    expectError(await postTask(outsider, { title: 'Sneaky' }), 403);
    expectError(await postTask(member, { title: 'Lost' }, { _id: MISSING_ID }), 404);
  });
});

describe('due dates', () => {
  const dueDateErrors = async (dueDate) => {
    const res = await postTask(member, { title: 'Dated', dueDate });
    expectError(res, 400, 'Validation failed');
    return res.body.errors;
  };

  it('accepts ISO 8601 dates and date-times with a timezone, years 2000 to 2100', async () => {
    const stored = async (dueDate) => (await createTask(member, project, { dueDate })).dueDate;

    expect(await stored('2030-01-15T18:29:59.999Z')).toBe('2030-01-15T18:29:59.999Z');
    expect(await stored('2030-01-15T23:59:59+05:30')).toBe('2030-01-15T18:29:59.000Z');
    expect(await stored('2030-01-15')).toBe('2030-01-15T00:00:00.000Z'); // midnight UTC
    expect(await stored('2000-01-01')).toBe('2000-01-01T00:00:00.000Z');
    expect(await stored('2100-12-31T12:00:00Z')).toBe('2100-12-31T12:00:00.000Z');
  });

  it.each([
    ['a boolean', true],
    ['a number', 1],
    ['milliseconds since 1970', 99999999999999],
    ['a number in a string', '1'],
    ['a bare year', '2024'],
    ['a US-style date', '12/31/99'],
    ['an impossible calendar date', '2030-02-30'],
    ['a date-time without a timezone', '2030-01-15T10:00:00'],
  ])('rejects %s', async (_case, dueDate) => {
    expect(await dueDateErrors(dueDate)).toEqual([
      { field: 'dueDate', location: 'body', message: expect.stringContaining('ISO 8601') },
    ]);
  });

  it('rejects years before 2000 or after 2100', async () => {
    for (const dueDate of ['1999-12-31', '2101-01-01T00:00:00Z', '0001-01-01T00:00:00Z']) {
      expect(await dueDateErrors(dueDate), dueDate).toEqual([
        {
          field: 'dueDate',
          location: 'body',
          message: 'Due date must be between the years 2000 and 2100',
        },
      ]);
    }
  });
});

describe('GET /api/tasks/:taskId', () => {
  it('returns the task to team members only', async () => {
    const task = await createTask(owner, project);

    expect(expectSuccess(await getTask(member, task))._id).toBe(task._id);
    expectError(await getTask(outsider, task), 403);
    expectError(await getTask(member, { _id: MISSING_ID }), 404, 'Task not found');
  });
});

describe('GET /api/projects/:projectId/tasks', () => {
  it('returns every task grouped by status, each column in position order', async () => {
    const titles = ['todo', 'completed', 'in_progress', 'todo', 'in_progress'];
    for (const [index, status] of titles.entries()) {
      await createTask(member, project, { title: `${status} #${index}`, status });
    }

    const board = await listBoard();

    expect(board.map((task) => task.title)).toEqual([
      'todo #0',
      'todo #3',
      'in_progress #2',
      'in_progress #4',
      'completed #1',
    ]);
  });

  it('forbids users outside the team', async () => {
    const res = await api.get(`/api/projects/${project._id}/tasks`).set(authHeader(outsider));

    expectError(res, 403);
  });
});

describe('PATCH /api/tasks/:taskId', () => {
  it('sets completedAt when the task is completed and clears it when reopened', async () => {
    const task = await createTask(member, project);

    const completed = await updateTask(member, task, { status: 'completed' });
    const reopened = await updateTask(member, task, { status: 'in_progress' });

    expect(completed.completedAt).toEqual(expect.any(String));
    expect(reopened).toMatchObject({ status: 'in_progress', completedAt: null });
  });

  it('moves the task to the end of the target column when its status changes', async () => {
    const [first, second] = [
      await createTask(member, project, { status: 'in_progress' }),
      await createTask(member, project, { status: 'in_progress' }),
    ];
    const moved = await createTask(member, project, { status: 'todo' });

    const updated = await updateTask(member, moved, { status: 'in_progress' });

    expect(updated.position).toBeGreaterThan(second.position);
    const column = (await listBoard()).filter((task) => task.status === 'in_progress');
    expect(column.map((task) => task._id)).toEqual([first._id, second._id, moved._id]);
  });

  it('updates the task details', async () => {
    const task = await createTask(member, project);

    const updated = await updateTask(member, task, {
      title: 'Implement login page',
      description: 'Email + password form',
      priority: 'high',
      dueDate: '2030-03-01T18:29:59.999Z',
      labels: ['Auth'],
      assignee: admin._id,
    });

    expect(updated).toMatchObject({
      title: 'Implement login page',
      description: 'Email + password form',
      priority: 'high',
      dueDate: '2030-03-01T18:29:59.999Z',
      labels: ['auth'],
      assignee: { _id: admin._id },
    });
  });

  it('clears the due date with null or an empty string and unassigns with null', async () => {
    const task = await createTask(member, project, {
      dueDate: '2030-03-01T00:00:00.000Z',
      assignee: member._id,
    });

    expect((await updateTask(member, task, { dueDate: null, assignee: null })).dueDate).toBeNull();
    await updateTask(member, task, { dueDate: '2030-03-01T00:00:00.000Z' });
    const cleared = await updateTask(member, task, { dueDate: '' });

    expect(cleared).toMatchObject({ dueDate: null, assignee: null });
  });

  it('rejects an assignee from outside the team', async () => {
    const task = await createTask(member, project);

    const res = await patchTask(member, task, { assignee: outsider._id });

    expectError(res, 400);
    expect(errorFields(res)).toEqual(['assignee']);
  });

  it('leaves the task untouched when nothing really changes', async () => {
    const task = await createTask(member, project, { title: 'Stable', labels: ['b', 'a'] });
    const activityBefore = await Activity.countDocuments();

    const res = await patchTask(member, task, {
      title: '  Stable ',
      status: 'todo',
      labels: ['A', 'b'],
      assignee: null,
    });

    expect(expectSuccess(res).updatedAt).toBe(task.updatedAt);
    expect(await Activity.countDocuments()).toBe(activityBefore);
  });

  it('requires at least one known field', async () => {
    const task = await createTask(member, project);

    expectError(await patchTask(member, task, { foo: 'bar' }), 400, 'Validation failed');
  });

  it('forbids users outside the team', async () => {
    const task = await createTask(member, project);

    expectError(await patchTask(outsider, task, { title: 'Hijacked' }), 403);
  });

  it('survives concurrent label edits of the same task (last write wins)', async () => {
    const task = await createTask(member, project);
    const edits = [['api'], ['ui'], ['bug'], ['docs'], ['qa'], ['infra']];

    const responses = await Promise.all(
      edits.map((labels, index) => patchTask(index % 2 ? admin : member, task, { labels })),
    );

    responses.forEach((res) => expectSuccess(res));
    const saved = expectSuccess(await getTask(member, task));
    expect(edits).toContainEqual(saved.labels);
  });
});

describe('DELETE /api/tasks/:taskId', () => {
  it('lets the creator delete their own task', async () => {
    const task = await createTask(member, project);

    const res = await deleteTask(member, task);

    expect(res.body).toEqual({ success: true, message: 'Task deleted' });
    expectError(await getTask(member, task), 404);
  });

  it("lets owners and admins delete anyone's task", async () => {
    const tasks = [await createTask(member, project), await createTask(member, project)];

    expect((await deleteTask(admin, tasks[0])).status).toBe(200);
    expect((await deleteTask(owner, tasks[1])).status).toBe(200);
  });

  it("forbids plain members from deleting other people's tasks", async () => {
    const task = await createTask(owner, project);

    expectError(await deleteTask(member, task), 403, 'Only the task creator or a team owner/admin');
    expectSuccess(await getTask(member, task));
  });

  it('also deletes the comments and notifications of the task', async () => {
    const task = await createTask(owner, project, { assignee: member._id });
    await addComment(member, task, 'First');
    await addComment(owner, task, 'Second');
    expect(await Notification.countDocuments({ task: task._id })).toBeGreaterThan(0);

    expect((await deleteTask(owner, task)).status).toBe(200);

    expect(await Comment.countDocuments({ task: task._id })).toBe(0);
    expect(await Notification.countDocuments({ task: task._id })).toBe(0);
  });
});
