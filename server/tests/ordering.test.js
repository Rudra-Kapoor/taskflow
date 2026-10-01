import { beforeEach, describe, expect, it } from 'vitest';
import { Task } from '../src/models/index.js';
import { POSITION_GAP } from '../src/utils/constants.js';
import {
  api,
  authHeader,
  createProject,
  createTask,
  createWorkspace,
  errorFields,
  expectError,
  expectSuccess,
  resetDatabase,
} from './helpers.js';

let owner;
let member;
let outsider;
let team;
let project;
let a;
let b;
let c;

const move = (task, body, user = member) =>
  api.patch(`/api/tasks/${task._id}/move`).set(authHeader(user)).send(body);

/** Titles of a board column, top to bottom, as the client would render them. */
async function column(status) {
  const res = await api.get(`/api/projects/${project._id}/tasks`).set(authHeader(member));
  return expectSuccess(res)
    .filter((task) => task.status === status)
    .map((task) => task.title);
}

beforeEach(async () => {
  await resetDatabase();
  ({ owner, member, outsider, team, project } = await createWorkspace());
  a = await createTask(member, project, { title: 'A' });
  b = await createTask(member, project, { title: 'B' });
  c = await createTask(member, project, { title: 'C' });
});

describe('PATCH /api/tasks/:taskId/move', () => {
  it('starts with tasks spaced evenly in creation order', async () => {
    expect([a.position, b.position, c.position]).toEqual([1, 2, 3].map((n) => n * POSITION_GAP));
    expect(await column('todo')).toEqual(['A', 'B', 'C']);
  });

  it('drops a task between its two neighbours', async () => {
    const { task, reordered } = expectSuccess(
      await move(c, { status: 'todo', prevTaskId: a._id, nextTaskId: b._id }),
    );

    expect(task.position).toBe((a.position + b.position) / 2);
    expect(reordered).toEqual([]);
    expect(await column('todo')).toEqual(['A', 'C', 'B']);
  });

  it('drops a task at the top of the column when only nextTaskId is given', async () => {
    expectSuccess(await move(c, { status: 'todo', nextTaskId: a._id }));

    expect(await column('todo')).toEqual(['C', 'A', 'B']);
  });

  it('drops a task at the bottom of the column when only prevTaskId is given', async () => {
    expectSuccess(await move(a, { status: 'todo', prevTaskId: c._id, nextTaskId: null }));

    expect(await column('todo')).toEqual(['B', 'C', 'A']);
  });

  it('appends the task to the end of the column when no neighbour is given', async () => {
    expectSuccess(await move(a, { status: 'todo' }));

    expect(await column('todo')).toEqual(['B', 'C', 'A']);
  });

  it('moves a task across columns and keeps both columns ordered', async () => {
    const first = expectSuccess(await move(b, { status: 'in_progress' }));
    expectSuccess(await move(c, { status: 'in_progress', nextTaskId: b._id }));

    expect(first.task).toMatchObject({ status: 'in_progress', position: POSITION_GAP });
    expect(await column('todo')).toEqual(['A']);
    expect(await column('in_progress')).toEqual(['C', 'B']);
  });

  it('sets completedAt when dropped into completed and clears it when dragged back', async () => {
    const done = expectSuccess(await move(a, { status: 'completed' })).task;
    const reopened = expectSuccess(await move(a, { status: 'todo', nextTaskId: b._id })).task;

    expect(done.completedAt).toEqual(expect.any(String));
    expect(reopened.completedAt).toBeNull();
    expect(await column('todo')).toEqual(['A', 'B', 'C']);
  });

  it('places the task right after prevTaskId even when filters hide tasks in between', async () => {
    const d = await createTask(member, project, { title: 'D' });

    // The client hides B with a filter, so it sees A directly above C.
    expectSuccess(await move(d, { status: 'todo', prevTaskId: a._id, nextTaskId: c._id }));

    expect(await column('todo')).toEqual(['A', 'D', 'B', 'C']);
  });

  it('is a no-op when the task is dropped where it already is', async () => {
    const { task } = expectSuccess(await move(a, { status: 'todo', nextTaskId: b._id }));

    expect(task.position).toBe(a.position);
    expect(task.updatedAt).toBe(a.updatedAt);
  });

  it('rejects neighbours from another project and the task itself', async () => {
    const otherProject = await createProject(owner, team);
    const foreign = await createTask(owner, otherProject);

    const attempts = [
      { status: 'todo', nextTaskId: foreign._id },
      { status: 'todo', prevTaskId: a._id, nextTaskId: foreign._id }, // even next to a valid one
      { status: 'todo', prevTaskId: c._id },
    ];
    for (const body of attempts) expectError(await move(c, body), 400, 'Invalid drop position');
    expect(await column('todo')).toEqual(['A', 'B', 'C']);
  });

  /*
   * Two people drag at once: the member drops on a board rendered before the owner moved or
   * deleted one of the neighbours it sends. Those neighbours are skipped instead of failing.
   */
  describe('from a stale board', () => {
    const deleteTask = (task) => api.delete(`/api/tasks/${task._id}`).set(authHeader(owner));

    it('ignores a neighbour moved to another column and drops before the other one', async () => {
      await createTask(member, project, { title: 'X', status: 'in_progress' });
      await createTask(member, project, { title: 'Y', status: 'in_progress' });
      expectSuccess(await move(a, { status: 'in_progress' }, owner)); // to the bottom, below Y

      // The member still sees A above B and drops C between them.
      expectSuccess(await move(c, { status: 'todo', prevTaskId: a._id, nextTaskId: b._id }));

      expect(await column('todo')).toEqual(['C', 'B']);
      expect(await column('in_progress')).toEqual(['X', 'Y', 'A']);
    });

    it('ignores a deleted neighbour and drops after the other one', async () => {
      const d = await createTask(member, project, { title: 'D' });
      expectSuccess(await deleteTask(b));

      // The member still sees B below A and drops D between them.
      expectSuccess(await move(d, { status: 'todo', prevTaskId: a._id, nextTaskId: b._id }));

      expect(await column('todo')).toEqual(['A', 'D', 'C']);
    });

    it('appends the task to the end of the column when neither neighbour is left', async () => {
      await createTask(member, project, { title: 'D' });
      expectSuccess(await move(a, { status: 'completed' }, owner));
      expectSuccess(await deleteTask(b));

      expectSuccess(await move(c, { status: 'todo', prevTaskId: a._id, nextTaskId: b._id }));

      expect(await column('todo')).toEqual(['D', 'C']);
    });
  });

  it('validates the payload', async () => {
    const sameNeighbours = await move(c, { status: 'todo', prevTaskId: a._id, nextTaskId: a._id });
    const malformed = await move(c, { status: 'blocked', prevTaskId: '123' });

    expectError(sameNeighbours, 400);
    expect(errorFields(sameNeighbours)).toEqual(['nextTaskId']);
    expectError(malformed, 400);
    expect(errorFields(malformed).sort()).toEqual(['prevTaskId', 'status']);
  });

  it('forbids users outside the team', async () => {
    expectError(await move(a, { status: 'completed' }, outsider), 403);
  });

  it('re-balances a column whose positions are too close and reports the moved tasks', async () => {
    const d = await createTask(member, project, { title: 'D' });
    // Craft a gap between A and B that is too small to split.
    await Task.updateOne({ _id: b._id }, { $set: { position: a.position + 1e-7 } });
    await Task.updateOne({ _id: c._id }, { $set: { position: 5000 } });

    const { task, reordered } = expectSuccess(
      await move(d, { status: 'todo', prevTaskId: a._id, nextTaskId: b._id }),
    );

    // The column without D is re-spaced (A keeps its position), then D lands between A and B.
    expect(reordered).toEqual([
      { _id: b._id, position: 2 * POSITION_GAP },
      { _id: c._id, position: 3 * POSITION_GAP },
    ]);
    expect(task.position).toBe(1.5 * POSITION_GAP);
    expect(await column('todo')).toEqual(['A', 'D', 'B', 'C']);
  });

  it('keeps a consistent order after many drops into the same gap', async () => {
    let rebalanced = false;
    for (let i = 0; i < 40; i += 1) {
      const mover = i % 2 === 0 ? c : b;
      const { reordered } = expectSuccess(await move(mover, { status: 'todo', prevTaskId: a._id }));
      rebalanced ||= reordered.length > 0;
    }

    expect(rebalanced).toBe(true);
    const tasks = await Task.find({ project: project._id }).sort({ position: 1 }).lean();
    const positions = tasks.map((task) => task.position);
    expect(new Set(positions).size).toBe(positions.length);
    expect(await column('todo')).toEqual(['A', 'B', 'C']);
  });
});
