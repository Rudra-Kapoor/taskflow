import { beforeAll, describe, expect, it } from 'vitest';
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
  errorFields,
  expectError,
  expectSuccess,
  HOUR,
  IST,
  isoDate,
  localDayStart,
  registerUser,
  todayInIndiaOnly,
} from './helpers.js';

async function findTasks(user, query = {}) {
  const res = await api.get('/api/tasks').query(query).set(authHeader(user));
  return { tasks: expectSuccess(res), meta: res.body.meta };
}

/*
 * One read-only dataset for the whole file. Alice and Bob share a team with two active projects
 * and an archived one; Carol has her own team whose tasks must never leak into their results.
 */
let alice;
let bob;
let carol;
let apiProject;
let legacyProject;
let carolProject;
const nameById = new Map();

/** Short dataset names of the tasks, in response order. */
const names = (tasks) => tasks.map((task) => nameById.get(task._id) ?? `foreign:${task.title}`);

async function findNames(user, query) {
  return names((await findTasks(user, query)).tasks);
}

beforeAll(async () => {
  [alice, bob, carol] = await Promise.all([
    registerUser({ name: 'Alice' }),
    registerUser({ name: 'Bob' }),
    registerUser({ name: 'Carol' }),
  ]);
  const team = await createTeam(alice);
  await addMember(alice, team, bob);
  const web = await createProject(alice, team, { key: 'WEB' });
  apiProject = await createProject(alice, team, { key: 'API' });

  const now = Date.now();
  const todayStart = localDayStart(IST, now);
  const add = async (name, project, body) => {
    nameById.set((await createTask(alice, project, body))._id, name);
  };

  // Created one after the other, so "oldest" sorting follows this order (WEB-1, WEB-2, ...).
  await add('login', web, {
    title: 'Fix login redirect',
    priority: 'urgent',
    assignee: bob._id,
    dueDate: isoDate(now - 2 * DAY),
    labels: ['auth', 'frontend'],
  });
  await add('dashboard', web, {
    title: 'Design dashboard widgets',
    status: 'in_progress',
    priority: 'high',
    assignee: alice._id,
    dueDate: isoDate(todayStart + DAY - 1), // end of today in India, as the web client sends it
  });
  await add('docs', web, {
    title: 'Write API documentation',
    description: 'Document every endpoint',
    priority: 'low',
    dueDate: isoDate(todayStart + 3 * DAY + 12 * HOUR),
  });
  await add('release', web, {
    title: 'Release v1.0',
    status: 'completed',
    assignee: bob._id,
    dueDate: isoDate(now - 2 * DAY - HOUR),
  });
  await add('sprint', apiProject, {
    title: 'Plan the next sprint',
    dueDate: isoDate(todayStart + 10 * DAY),
  });
  await add('styles', web, {
    title: 'Refactor styles',
    priority: 'high',
    assignee: bob._id,
    labels: ['frontend', 'css'],
  });

  // Archived projects are read-only: their tasks are left out unless asked for.
  legacyProject = await createProject(alice, team, { key: 'OLD' });
  await add('archived', legacyProject, {
    title: 'Fix login on the legacy portal',
    assignee: bob._id,
    dueDate: isoDate(now - DAY),
  });
  await archiveProject(alice, legacyProject);

  const carolTeam = await createTeam(carol);
  carolProject = await createProject(carol, carolTeam, { key: 'CAR' });
  await createTask(carol, carolProject, { title: 'Fix login redirect', priority: 'urgent' });
});

describe('GET /api/tasks', () => {
  it('returns every task of my active projects, most recently updated first', async () => {
    const { tasks, meta } = await findTasks(bob);

    expect(names(tasks)).toEqual(['styles', 'sprint', 'release', 'docs', 'dashboard', 'login']);
    expect(meta).toEqual({ page: 1, limit: 20, total: 6, totalPages: 1 });
  });

  it('includes archived projects on request, or when one is asked for explicitly', async () => {
    const legacyOnly = await findNames(bob, { project: legacyProject._id });
    const everything = await findNames(bob, { includeArchived: 'true', sort: 'oldest' });

    expect(legacyOnly).toEqual(['archived']);
    expect(everything).toEqual([
      'login',
      'dashboard',
      'docs',
      'release',
      'sprint',
      'styles',
      'archived',
    ]);
    expect(await findNames(bob, { search: 'login' })).toEqual(['login']);
    expect(await findNames(bob, { search: 'login', includeArchived: 'false' })).toEqual(['login']);
    const myOverdueTasks = { assignee: 'me', due: 'overdue', includeArchived: 'true' };
    expect(await findNames(bob, myOverdueTasks)).toEqual(['archived', 'login']);
  });

  it('never returns tasks from teams the user does not belong to', async () => {
    expect(await findNames(carol)).toEqual(['foreign:Fix login redirect']);
    expect(await findNames(bob, { search: 'login' })).toEqual(['login']);
  });

  it('returns complete tasks without the internal sorting fields', async () => {
    const [task] = (await findTasks(bob, { search: 'dashboard' })).tasks;

    expect(task).toMatchObject({
      project: { key: 'WEB' },
      createdBy: { _id: alice._id, name: 'Alice' },
      assignee: { _id: alice._id, name: 'Alice' },
    });
    for (const field of ['priorityRank', 'noDueDate', '__v', 'dueReminderSentAt']) {
      expect(task).not.toHaveProperty(field);
    }
  });

  describe('filters', () => {
    it('matches the search text in the title or the description, case-insensitively', async () => {
      expect(await findNames(bob, { search: 'API DOC' })).toEqual(['docs']);
      expect(await findNames(bob, { search: 'every endpoint' })).toEqual(['docs']);
    });

    it('treats special characters in the search text literally', async () => {
      expect(await findNames(bob, { search: 'v1.0' })).toEqual(['release']);
      expect(await findNames(bob, { search: '.*' })).toEqual([]);
    });

    it('also matches labels, and task keys such as "web-2"', async () => {
      const byLabel = await findNames(bob, { search: 'FRONT', sort: 'oldest' });
      expect(byLabel).toEqual(['login', 'styles']);
      expect(await findNames(bob, { search: 'css' })).toEqual(['styles']);
      expect(await findNames(bob, { search: 'web-2' })).toEqual(['dashboard']);
      expect(await findNames(bob, { search: 'API-1' })).toEqual(['sprint']);
      expect(await findNames(bob, { search: 'web-99' })).toEqual([]);
    });

    it('only resolves task keys inside the projects being searched', async () => {
      expect(await findNames(bob, { search: 'car-1' })).toEqual([]); // Carol's team
      expect(await findNames(bob, { search: 'old-1' })).toEqual([]); // archived project
      expect(await findNames(bob, { search: 'old-1', includeArchived: 'true' })).toEqual([
        'archived',
      ]);
      expect(await findNames(bob, { search: 'web-2', project: apiProject._id })).toEqual([]);
    });

    it('filters by status, where "open" means not completed', async () => {
      const byStatus = (status) => findNames(bob, { status, sort: 'oldest' });

      expect(await byStatus('todo')).toEqual(['login', 'docs', 'sprint', 'styles']);
      expect(await byStatus('open')).toEqual(['login', 'dashboard', 'docs', 'sprint', 'styles']);
      expect(await byStatus('completed')).toEqual(['release']);
    });

    it('filters by priority', async () => {
      expect(await findNames(bob, { priority: 'high', sort: 'oldest' })).toEqual([
        'dashboard',
        'styles',
      ]);
    });

    it('filters by assignee: "me", "unassigned" or a user id', async () => {
      const byAssignee = (assignee) => findNames(bob, { assignee, sort: 'oldest' });

      expect(await byAssignee('me')).toEqual(['login', 'release', 'styles']);
      expect(await byAssignee('unassigned')).toEqual(['docs', 'sprint']);
      expect(await byAssignee(alice._id.toUpperCase())).toEqual(['dashboard']);
    });

    it('finds open tasks that are overdue', async () => {
      expect(await findNames(bob, { due: 'overdue' })).toEqual(['login']);
    });

    it('finds tasks due today and within the next 7 days in the client timezone', async () => {
      const byDue = (due) => findNames(bob, { due, tzOffset: IST, sort: 'due_asc' });

      expect(await byDue('today')).toEqual(['dashboard']);
      expect(await byDue('week')).toEqual(['dashboard', 'docs']);
    });

    it('finds tasks without a due date', async () => {
      expect(await findNames(bob, { due: 'none' })).toEqual(['styles']);
    });

    it('combines filters', async () => {
      const query = { status: 'open', assignee: 'me', priority: 'urgent', due: 'overdue' };

      expect(await findNames(bob, query)).toEqual(['login']);
    });

    it('restricts the search to one project the user can access', async () => {
      expect(await findNames(bob, { project: apiProject._id })).toEqual(['sprint']);
      expectError(
        await api.get('/api/tasks').query({ project: carolProject._id }).set(authHeader(bob)),
        403,
        'You do not have access to this project',
      );
    });

    it('ignores blank parameters', async () => {
      const { meta } = await findTasks(bob, { search: '', status: '', priority: '', due: '' });

      expect(meta.total).toBe(6);
    });

    it('validates the parameters', async () => {
      const res = await api
        .get('/api/tasks')
        .query({
          status: 'done',
          assignee: 'someone',
          due: 'later',
          sort: 'bogus',
          limit: 500,
          includeArchived: 'yes',
        })
        .set(authHeader(bob));

      expectError(res, 400, 'Validation failed');
      expect(errorFields(res).sort()).toEqual([
        'assignee',
        'due',
        'includeArchived',
        'limit',
        'sort',
        'status',
      ]);
      expect(res.body.errors.every((error) => error.location === 'query')).toBe(true);
    });
  });

  describe('sorting and pagination', () => {
    it('sorts by priority from urgent to low', async () => {
      const { tasks } = await findTasks(bob, { sort: 'priority' });

      expect(tasks.map((task) => task.priority)).toEqual([
        'urgent',
        'high',
        'high',
        'medium',
        'medium',
        'low',
      ]);
    });

    it('sorts by due date in both directions, always listing undated tasks last', async () => {
      expect(await findNames(bob, { sort: 'due_asc' })).toEqual([
        'release',
        'login',
        'dashboard',
        'docs',
        'sprint',
        'styles',
      ]);
      expect(await findNames(bob, { sort: 'due_desc' })).toEqual([
        'sprint',
        'docs',
        'dashboard',
        'login',
        'release',
        'styles',
      ]);
    });

    it('sorts by creation date', async () => {
      const oldest = ['login', 'dashboard', 'docs', 'release', 'sprint', 'styles'];

      expect(await findNames(bob, { sort: 'oldest' })).toEqual(oldest);
      expect(await findNames(bob, { sort: 'newest' })).toEqual([...oldest].reverse());
    });

    it('paginates the results', async () => {
      const page2 = await findTasks(bob, { sort: 'oldest', limit: 2, page: 2 });
      const beyond = await findTasks(bob, { sort: 'oldest', limit: 2, page: 4 });

      expect(names(page2.tasks)).toEqual(['docs', 'release']);
      expect(page2.meta).toEqual({ page: 2, limit: 2, total: 6, totalPages: 3 });
      expect(beyond.tasks).toEqual([]);
      expect(beyond.meta.total).toBe(6);
    });
  });
});

describe('GET /api/tasks with a task key spanning teams', () => {
  it('finds the task with that key in each of my teams (keys are unique per team)', async () => {
    const user = await registerUser();
    const [first, second] = [await createTeam(user), await createTeam(user)];
    await createTask(user, await createProject(user, first, { key: 'WEB' }), { title: 'First' });
    await createTask(user, await createProject(user, second, { key: 'WEB' }), { title: 'Second' });

    const { tasks } = await findTasks(user, { search: 'Web-1', sort: 'oldest' });

    expect(tasks.map((task) => task.title)).toEqual(['First', 'Second']);
  });
});

describe('GET /api/tasks?completedWithin', () => {
  it('only returns tasks completed within the last N days', async () => {
    const user = await registerUser();
    const project = await createProject(user, await createTeam(user));
    await createTask(user, project, { title: 'Done today', status: 'completed' });
    const old = await createTask(user, project, { title: 'Done last month', status: 'completed' });
    await createTask(user, project, { title: 'Still open' });
    await Task.updateOne({ _id: old._id }, { completedAt: new Date(Date.now() - 30 * DAY) });
    const titles = async (completedWithin) =>
      (await findTasks(user, { completedWithin, sort: 'oldest' })).tasks.map((task) => task.title);

    expect(await titles(7)).toEqual(['Done today']);
    expect(await titles(31)).toEqual(['Done today', 'Done last month']);
  });

  it('accepts a whole number of days from 1 to 365', async () => {
    for (const completedWithin of ['0', '366', '1.5', 'week']) {
      const res = await api.get('/api/tasks').query({ completedWithin }).set(authHeader(bob));

      expectError(res, 400, 'Validation failed');
      expect(errorFields(res), completedWithin).toEqual(['completedWithin']);
    }
  });
});

describe('GET /api/tasks with a timezone offset', () => {
  it('interprets "today" in the timezone sent by the client', async () => {
    const user = await registerUser();
    const project = await createProject(user, await createTeam(user));
    await createTask(user, project, { dueDate: isoDate(todayInIndiaOnly()) });

    expect((await findTasks(user, { due: 'today', tzOffset: IST })).tasks).toHaveLength(1);
    expect((await findTasks(user, { due: 'today', tzOffset: 0 })).tasks).toHaveLength(0);
  });
});
