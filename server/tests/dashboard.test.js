import { beforeEach, describe, expect, it } from 'vitest';
import { Task } from '../src/models/index.js';
import {
  addMember,
  api,
  archiveProject,
  authHeader,
  createProject,
  createTask,
  createTeam,
  DAY,
  expectError,
  expectSuccess,
  HOUR,
  IST,
  isoDate,
  localDayStart,
  registerUser,
  resetDatabase,
  todayInIndiaOnly,
  updateTask,
} from './helpers.js';

const getDashboard = async (user, query = { tzOffset: IST }) =>
  expectSuccess(await api.get('/api/dashboard').query(query).set(authHeader(user)));

let me;
let lead;
let teammate;
let product;
let web;
let ops;

beforeEach(async () => {
  await resetDatabase();
  [me, lead, teammate] = await Promise.all([
    registerUser({ name: 'Dana Developer' }),
    registerUser({ name: 'Leo Lead' }),
    registerUser({ name: 'Tina Teammate' }),
  ]);
  product = await createTeam(lead, { name: 'Product' });
  await addMember(lead, product, me);
  await addMember(lead, product, teammate);
  const operations = await createTeam(me, { name: 'Operations' });
  web = await createProject(lead, product, { key: 'WEB' });
  ops = await createProject(me, operations, { key: 'OPS' });
});

describe('GET /api/dashboard', () => {
  it('summarises my work in my active projects for the given timezone', async () => {
    const now = Date.now();
    const todayStart = localDayStart(IST, now);
    const mine = { assignee: me._id };

    const overdue = await createTask(lead, web, {
      ...mine,
      title: 'Overdue bug',
      priority: 'high',
      dueDate: isoDate(now - 2 * DAY),
    });
    const dueToday = await createTask(lead, web, {
      ...mine,
      title: 'Due today',
      status: 'in_progress',
      priority: 'urgent',
      dueDate: isoDate(todayStart + DAY - 1),
    });
    const nextWeek = await createTask(me, ops, {
      ...mine,
      title: 'Later this week',
      priority: 'high',
      dueDate: isoDate(todayStart + 3 * DAY + 12 * HOUR),
    });
    const someday = await createTask(me, ops, { ...mine, title: 'Someday' });
    await updateTask(me, await createTask(lead, web, mine), { status: 'completed' });
    const longAgo = await createTask(lead, web, { ...mine, status: 'completed' });
    await Task.updateOne({ _id: longAgo._id }, { completedAt: new Date(now - 10 * DAY) });
    await createTask(lead, web, { assignee: teammate._id });
    await createTask(me, ops, { status: 'in_progress' });

    // Archived projects are read-only, and other teams' projects are not mine: neither counts.
    const legacy = await createProject(lead, product, { key: 'OLD' });
    await createTask(lead, legacy, { ...mine, dueDate: isoDate(now - DAY) });
    await archiveProject(lead, legacy);
    const elsewhere = await createProject(teammate, await createTeam(teammate));
    await createTask(teammate, elsewhere, { assignee: teammate._id, status: 'completed' });

    const dashboard = await getDashboard(me);

    expect(dashboard.stats).toEqual({
      assignedOpen: 4,
      overdue: 1,
      dueToday: 1,
      completedThisWeek: 1,
      projects: 2,
      teams: 2,
    });
    expect(dashboard.statusBreakdown).toEqual({ todo: 4, in_progress: 2, completed: 2 });
    expect(dashboard.priorityBreakdown).toEqual({ low: 0, medium: 1, high: 2, urgent: 1 });
    expect(dashboard.upcomingTasks.map((task) => task._id)).toEqual([
      overdue._id,
      dueToday._id,
      nextWeek._id,
      someday._id,
    ]);
    expect(dashboard.upcomingTasks[0]).toMatchObject({
      title: 'Overdue bug',
      project: { key: 'WEB' },
      assignee: { _id: me._id, name: 'Dana Developer' },
    });
  });

  it('agrees with the task lists its stat cards link to, even with archived projects', async () => {
    const now = Date.now();
    const todayStart = localDayStart(IST, now);
    const mine = { assignee: me._id };
    await createTask(lead, web, { ...mine, priority: 'high', dueDate: isoDate(now - DAY) });
    await createTask(me, ops, { ...mine, dueDate: isoDate(todayStart + DAY - 1) });
    await createTask(me, ops, { ...mine, status: 'in_progress', priority: 'urgent' });
    await updateTask(me, await createTask(me, ops, mine), { status: 'completed' });
    const longAgo = await createTask(lead, web, { ...mine, status: 'completed' });
    await Task.updateOne({ _id: longAgo._id }, { completedAt: new Date(now - 10 * DAY) });
    // The same kinds of tasks in an archived project, which neither side may count.
    const legacy = await createProject(lead, product, { key: 'OLD' });
    await createTask(lead, legacy, { ...mine, priority: 'high', dueDate: isoDate(now - DAY) });
    await createTask(lead, legacy, { ...mine, dueDate: isoDate(todayStart + DAY - 1) });
    await createTask(lead, legacy, { ...mine, status: 'completed' });
    await archiveProject(lead, legacy);

    const { stats, priorityBreakdown } = await getDashboard(me);
    const listed = async (query) => {
      const res = await api
        .get('/api/tasks')
        .query({ assignee: 'me', tzOffset: IST, ...query })
        .set(authHeader(me));
      return res.body.meta.total;
    };

    expect(stats).toMatchObject({ assignedOpen: 3, overdue: 1, dueToday: 1, completedThisWeek: 1 });
    expect(await listed({ status: 'open' })).toBe(stats.assignedOpen);
    expect(await listed({ due: 'overdue' })).toBe(stats.overdue);
    expect(await listed({ status: 'open', due: 'today' })).toBe(stats.dueToday);
    expect(await listed({ status: 'completed', completedWithin: 7 })).toBe(
      stats.completedThisWeek,
    );
    for (const [priority, count] of Object.entries(priorityBreakdown)) {
      expect(await listed({ status: 'open', priority }), priority).toBe(count);
    }
  });

  it('counts "due today" in the timezone sent by the client', async () => {
    await createTask(me, ops, { assignee: me._id, dueDate: isoDate(todayInIndiaOnly()) });

    expect((await getDashboard(me, { tzOffset: IST })).stats.dueToday).toBe(1);
    expect((await getDashboard(me, { tzOffset: 0 })).stats.dueToday).toBe(0);
  });

  it('lists at most 6 upcoming tasks, nearest due date first and undated tasks last', async () => {
    const now = Date.now();
    const mine = { assignee: me._id };
    for (const days of [5, 1, 4, 2, 3]) {
      const dueDate = isoDate(now + days * DAY);
      await createTask(me, ops, { ...mine, title: `In ${days} days`, dueDate });
    }
    for (let i = 0; i < 3; i += 1) await createTask(me, ops, { ...mine, title: 'Undated' });

    const { upcomingTasks } = await getDashboard(me);

    expect(upcomingTasks.map((task) => task.title)).toEqual([
      'In 1 days',
      'In 2 days',
      'In 3 days',
      'In 4 days',
      'In 5 days',
      'Undated',
    ]);
  });

  it('starts empty for a new user', async () => {
    const newcomer = await registerUser();

    expect(await getDashboard(newcomer)).toEqual({
      stats: {
        assignedOpen: 0,
        overdue: 0,
        dueToday: 0,
        completedThisWeek: 0,
        projects: 0,
        teams: 0,
      },
      statusBreakdown: { todo: 0, in_progress: 0, completed: 0 },
      priorityBreakdown: { low: 0, medium: 0, high: 0, urgent: 0 },
      upcomingTasks: [],
    });
  });

  it('validates the timezone offset', async () => {
    for (const tzOffset of ['9999', 'abc', '1.5']) {
      const res = await api.get('/api/dashboard').query({ tzOffset }).set(authHeader(me));
      expectError(res, 400, 'Validation failed');
    }
  });
});
