import { beforeEach, describe, expect, it } from 'vitest';
import { backfillProjectLastActivity } from '../src/migrations.js';
import { Activity, Comment, Notification, Project, Task } from '../src/models/index.js';
import {
  addComment,
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
  resetDatabase,
} from './helpers.js';

let owner;
let admin;
let member;
let outsider;
let team;
let project;

const listProjects = (user, query = {}) =>
  api.get('/api/projects').query(query).set(authHeader(user));

const getProject = (user, { _id }) => api.get(`/api/projects/${_id}`).set(authHeader(user));

const updateProject = (user, { _id }, changes) =>
  api.patch(`/api/projects/${_id}`).set(authHeader(user)).send(changes);

const postProject = (user, body) => api.post('/api/projects').set(authHeader(user)).send(body);

const keys = (projects) => projects.map((p) => p.key);

beforeEach(async () => {
  await resetDatabase();
  ({ owner, admin, member, outsider, team, project } = await createWorkspace());
});

describe('POST /api/projects', () => {
  it('lets an admin create a project with an upper-cased key and defaults', async () => {
    const res = await postProject(admin, { name: 'Mobile App', key: 'mob', team: team._id });

    const created = expectSuccess(res, 201);
    expect(created).toMatchObject({
      name: 'Mobile App',
      key: 'MOB',
      description: '',
      color: '#6366f1',
      status: 'active',
      team: { _id: team._id, name: 'Product Engineering' },
      createdBy: { _id: admin._id, name: 'Adam Admin' },
      taskCounts: { todo: 0, in_progress: 0, completed: 0, total: 0 },
      myRole: 'admin',
      lastActivityAt: expect.any(String),
    });
    expect(created).not.toHaveProperty('taskSeq');
  });

  it('forbids plain members and users outside the team', async () => {
    const body = { name: 'Side project', key: 'SIDE', team: team._id };

    expectError(await postProject(member, body), 403, 'Only team owners and admins');
    expectError(await postProject(outsider, body), 403);
  });

  it('rejects a key that is already used in the same team', async () => {
    const res = await postProject(owner, { name: 'Another web app', key: 'web', team: team._id });

    expectError(res, 409, 'Project key WEB is already used in this team');
  });

  it('allows the same key in another team', async () => {
    const otherTeam = await createTeam(outsider);

    const res = await postProject(outsider, { name: 'Their app', key: 'WEB', team: otherTeam._id });

    expect(expectSuccess(res, 201).key).toBe('WEB');
  });

  it('validates the name, key, colour and team', async () => {
    const res = await postProject(owner, { name: 'X', key: '1AB', color: 'red', team: 'nope' });

    expectError(res, 400, 'Validation failed');
    expect(errorFields(res).sort()).toEqual(['color', 'key', 'name', 'team']);
  });
});

describe('GET /api/projects', () => {
  beforeEach(async () => {
    await createTask(owner, project, { status: 'todo' });
    await createTask(owner, project, { status: 'in_progress' });
    await createTask(owner, project, { status: 'completed' });
    await createTask(owner, project, { status: 'completed' });
    await createProject(owner, team, {
      name: 'Mobile App',
      key: 'MOB',
      description: 'React Native client',
    });
    const legacy = await createProject(owner, team, { name: 'Legacy Portal', key: 'OLD' });
    expectSuccess(await updateProject(owner, legacy, { status: 'archived' }));
  });

  it('lists active projects with task counts and the viewer role', async () => {
    const projects = expectSuccess(await listProjects(member));

    expect(keys(projects).sort()).toEqual(['MOB', 'WEB']);
    const web = projects.find((p) => p.key === 'WEB');
    expect(web).toMatchObject({
      myRole: 'member',
      team: { _id: team._id, name: 'Product Engineering' },
      taskCounts: { todo: 1, in_progress: 1, completed: 2, total: 4 },
    });
  });

  it('filters by status: archived or all', async () => {
    const byStatus = async (status) => keys(expectSuccess(await listProjects(member, { status })));

    expect(await byStatus('archived')).toEqual(['OLD']);
    expect((await byStatus('all')).sort()).toEqual(['MOB', 'OLD', 'WEB']);
  });

  it('searches name, key and description case-insensitively', async () => {
    const search = async (text) =>
      keys(expectSuccess(await listProjects(member, { search: text })));

    expect(await search('mob')).toEqual(['MOB']);
    expect(await search('NATIVE')).toEqual(['MOB']);
    expect(await search('web app')).toEqual(['WEB']);
    expect(await search('nothing like this')).toEqual([]);
  });

  it("filters by team and rejects teams the user doesn't belong to", async () => {
    const otherTeam = await createTeam(outsider);
    await createProject(outsider, otherTeam, { key: 'OUT' });

    expect(keys(expectSuccess(await listProjects(member, { team: team._id }))).sort()).toEqual([
      'MOB',
      'WEB',
    ]);
    expect(keys(expectSuccess(await listProjects(member, { status: 'all' })))).not.toContain('OUT');
    expectError(await listProjects(member, { team: otherTeam._id }), 403);
  });

  it('sorts by the most recently active project first', async () => {
    const res = await updateProject(owner, project, { description: 'Updated just now' });
    const updated = expectSuccess(res);

    expect(new Date(updated.lastActivityAt) > new Date(project.lastActivityAt)).toBe(true);
    expect(keys(expectSuccess(await listProjects(member)))).toEqual(['WEB', 'MOB']);
  });

  it('counts work on tasks and comments as activity, without touching updatedAt', async () => {
    const order = async () => keys(expectSuccess(await listProjects(member)));
    const mobile = expectSuccess(await listProjects(member)).find((p) => p.key === 'MOB');
    expect(await order()).toEqual(['MOB', 'WEB']); // MOB was created after the WEB tasks

    const task = await createTask(member, project);
    expect(await order()).toEqual(['WEB', 'MOB']);
    await createTask(member, mobile);
    expect(await order()).toEqual(['MOB', 'WEB']);
    await addComment(member, task);
    expect(await order()).toEqual(['WEB', 'MOB']);
    await createTask(member, mobile);
    // Reordering a column by drag and drop is not logged, but still counts.
    const boardRes = await api.get(`/api/projects/${project._id}/tasks`).set(authHeader(member));
    const isOtherTodo = (t) => t.status === 'todo' && t._id !== task._id;
    const firstTodo = expectSuccess(boardRes).find(isOtherTodo);
    const moved = await api
      .patch(`/api/tasks/${task._id}/move`)
      .set(authHeader(member))
      .send({ status: 'todo', nextTaskId: firstTodo._id });
    expectSuccess(moved);
    expect(await order()).toEqual(['WEB', 'MOB']);

    const web = expectSuccess(await getProject(member, project));
    const newest = await Activity.findOne({ project: project._id }).sort({ createdAt: -1 });
    expect(new Date(web.lastActivityAt) > newest.createdAt).toBe(true); // the reorder
    expect(web.updatedAt).toBe(project.updatedAt);
  });
});

describe('projects created before lastActivityAt existed', () => {
  it('get the time of their newest activity entry, or their updatedAt', async () => {
    const quiet = await createProject(owner, team, { key: 'QUIET' });
    await createTask(member, project);
    await Activity.deleteMany({ project: quiet._id });
    await Project.collection.updateMany({}, { $unset: { lastActivityAt: '' } });
    const newest = await Activity.findOne({ project: project._id }).sort({ createdAt: -1 });

    expect(await backfillProjectLastActivity()).toBe(2);
    expect(await backfillProjectLastActivity()).toBe(0); // only once

    const web = await Project.findById(project._id).lean();
    const upgraded = await Project.findById(quiet._id).lean();
    expect(web.lastActivityAt).toEqual(newest.createdAt);
    expect(upgraded.lastActivityAt).toEqual(upgraded.updatedAt);
  });
});

describe('GET /api/projects/:projectId', () => {
  it('includes the full team so that assignees can be picked', async () => {
    const details = expectSuccess(await getProject(member, project));

    expect(details).toMatchObject({ _id: project._id, key: 'WEB', myRole: 'member' });
    expect(details.team.members.map((m) => [m.user.name, m.role])).toEqual([
      ['Olivia Owner', 'owner'],
      ['Adam Admin', 'admin'],
      ['Mia Member', 'member'],
    ]);
    expect(details.team).not.toHaveProperty('myRole');
    expect(details.team).not.toHaveProperty('projectCount');
  });

  it('returns 403 to users outside the team and 404 for an unknown project', async () => {
    expectError(await getProject(outsider, project), 403, 'You do not have access');
    expectError(await getProject(member, { _id: MISSING_ID }), 404);
  });
});

describe('PATCH /api/projects/:projectId', () => {
  it('lets managers rename, re-key and recolour a project', async () => {
    const res = await updateProject(admin, project, {
      name: 'Web Platform',
      key: 'app',
      color: '#22C55E',
    });

    expect(expectSuccess(res)).toMatchObject({
      name: 'Web Platform',
      key: 'APP',
      color: '#22c55e',
      myRole: 'admin',
    });
  });

  it('forbids plain members', async () => {
    expectError(await updateProject(member, project, { name: 'Renamed' }), 403);
  });

  it('rejects a key used by another project of the team', async () => {
    await createProject(owner, team, { key: 'API' });

    expectError(await updateProject(owner, project, { key: 'api' }), 409);
  });

  it('returns the project unchanged when nothing changes', async () => {
    const res = await updateProject(owner, project, { name: project.name, key: 'web' });

    expect(expectSuccess(res).updatedAt).toBe(project.updatedAt);
  });

  it('makes an archived project read-only for tasks and comments until restored', async () => {
    const task = await createTask(member, project);
    const archived = expectSuccess(await updateProject(admin, project, { status: 'archived' }));
    expect(archived.status).toBe('archived');

    const asMember = (req) => req.set(authHeader(member));
    const blocked = await Promise.all([
      asMember(api.post(`/api/projects/${project._id}/tasks`).send({ title: 'New' })),
      asMember(api.patch(`/api/tasks/${task._id}`).send({ title: 'Edited' })),
      asMember(api.patch(`/api/tasks/${task._id}/move`).send({ status: 'completed' })),
      asMember(api.post(`/api/tasks/${task._id}/comments`).send({ body: 'Hello' })),
      asMember(api.delete(`/api/tasks/${task._id}`)),
    ]);
    for (const res of blocked) expectError(res, 400, 'This project is archived');

    expectSuccess(await updateProject(admin, project, { status: 'active' }));
    await createTask(member, project, { title: 'Works again' });
  });
});

describe('DELETE /api/projects/:projectId', () => {
  it('deletes the project with its tasks, comments, notifications and activity', async () => {
    const task = await createTask(owner, project, { assignee: member._id });
    await addComment(member, task);

    const res = await api.delete(`/api/projects/${project._id}`).set(authHeader(admin));

    expect(res.body).toEqual({ success: true, message: 'Project deleted' });
    expectError(await getProject(owner, project), 404);
    const remaining = await Promise.all([
      Task.countDocuments({ project: project._id }),
      Comment.countDocuments({ project: project._id }),
      Notification.countDocuments({ project: project._id }),
      Activity.countDocuments({ project: project._id }),
    ]);
    expect(remaining).toEqual([0, 0, 0, 0]);
    // The deletion itself is logged at team level so it survives the cascade.
    const logged = await Activity.findOne({ action: 'project.deleted' }).lean();
    expect(logged).toMatchObject({
      project: null,
      meta: { projectName: 'TaskFlow Web App', projectKey: 'WEB' },
    });
  });

  it('forbids plain members', async () => {
    expectError(await api.delete(`/api/projects/${project._id}`).set(authHeader(member)), 403);
    expectSuccess(await getProject(member, project));
  });
});
