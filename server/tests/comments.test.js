import { beforeEach, describe, expect, it } from 'vitest';
import {
  addComment,
  api,
  authHeader,
  createTask,
  createWorkspace,
  errorFields,
  expectError,
  expectSuccess,
  resetDatabase,
} from './helpers.js';

let owner;
let admin;
let member;
let outsider;
let project;
let task;

const postComment = (user, body, target = task) =>
  api.post(`/api/tasks/${target._id}/comments`).set(authHeader(user)).send({ body });

const listComments = async (user = member) =>
  expectSuccess(await api.get(`/api/tasks/${task._id}/comments`).set(authHeader(user)));

const editComment = (user, comment, body) =>
  api.patch(`/api/comments/${comment._id}`).set(authHeader(user)).send({ body });

const deleteComment = (user, comment) =>
  api.delete(`/api/comments/${comment._id}`).set(authHeader(user));

const commentCount = async () =>
  expectSuccess(await api.get(`/api/tasks/${task._id}`).set(authHeader(member))).commentCount;

beforeEach(async () => {
  await resetDatabase();
  ({ owner, admin, member, outsider, project } = await createWorkspace());
  task = await createTask(owner, project, { title: 'Implement login page' });
});

describe('POST /api/tasks/:taskId/comments', () => {
  it('adds a trimmed comment by the current user and increments the comment count', async () => {
    const comment = expectSuccess(await postComment(member, '  Looks good to me!  '), 201);

    expect(comment).toMatchObject({
      task: task._id,
      project: project._id,
      author: { _id: member._id, name: 'Mia Member' },
      body: 'Looks good to me!',
      editedAt: null,
    });
    await addComment(owner, task, 'Thanks!');
    expect(await commentCount()).toBe(2);
  });

  it('rejects an empty or too long comment', async () => {
    for (const body of ['', '   ', 'x'.repeat(2001)]) {
      const res = await postComment(member, body);
      expectError(res, 400, 'Validation failed');
      expect(errorFields(res)).toEqual(['body']);
    }
    expect(await commentCount()).toBe(0);
  });

  it('forbids users outside the team', async () => {
    expectError(await postComment(outsider, 'Hi there'), 403);
  });
});

describe('GET /api/tasks/:taskId/comments', () => {
  it('lists the comments oldest first with their authors', async () => {
    await addComment(member, task, 'First');
    await addComment(owner, task, 'Second');
    await addComment(member, task, 'Third');

    const comments = await listComments();

    expect(comments.map((c) => [c.body, c.author.name])).toEqual([
      ['First', 'Mia Member'],
      ['Second', 'Olivia Owner'],
      ['Third', 'Mia Member'],
    ]);
  });

  it('forbids users outside the team', async () => {
    const res = await api.get(`/api/tasks/${task._id}/comments`).set(authHeader(outsider));

    expectError(res, 403);
  });
});

describe('PATCH /api/comments/:commentId', () => {
  it('lets the author edit the comment and records when it was edited', async () => {
    const comment = await addComment(member, task, 'Typo here');

    const edited = expectSuccess(await editComment(member, comment, 'No typo here'));

    expect(edited).toMatchObject({ _id: comment._id, body: 'No typo here' });
    expect(edited.editedAt).toEqual(expect.any(String));
    expect((await listComments())[0].body).toBe('No typo here');
  });

  it('does not mark an unchanged comment as edited', async () => {
    const comment = await addComment(member, task, 'Same text');

    expect(expectSuccess(await editComment(member, comment, ' Same text ')).editedAt).toBeNull();
  });

  it("forbids editing other people's comments, even for the team owner", async () => {
    const comment = await addComment(member, task, 'Mine');

    expectError(await editComment(owner, comment, 'Hijacked'), 403, 'only edit your own comments');
    expect((await listComments())[0].body).toBe('Mine');
  });

  it('validates the new body', async () => {
    const comment = await addComment(member, task, 'Mine');

    expectError(await editComment(member, comment, '  '), 400, 'Validation failed');
  });
});

describe('DELETE /api/comments/:commentId', () => {
  it('lets the author delete the comment and decrements the comment count', async () => {
    const comment = await addComment(member, task, 'Delete me');
    await addComment(owner, task, 'Keep me');

    const res = await deleteComment(member, comment);

    expect(res.body).toEqual({ success: true, message: 'Comment deleted' });
    expect((await listComments()).map((c) => c.body)).toEqual(['Keep me']);
    expect(await commentCount()).toBe(1);
  });

  it("lets team owners and admins delete anyone's comment", async () => {
    const first = await addComment(member, task, 'One');
    const second = await addComment(member, task, 'Two');

    expect((await deleteComment(admin, first)).status).toBe(200);
    expect((await deleteComment(owner, second)).status).toBe(200);
    expect(await commentCount()).toBe(0);
  });

  it("forbids plain members from deleting other people's comments", async () => {
    const comment = await addComment(owner, task, 'From the owner');

    expectError(await deleteComment(member, comment), 403, 'only delete your own comments');
    expect(await commentCount()).toBe(1);
  });

  it('returns 404 for a comment that no longer exists', async () => {
    const comment = await addComment(member, task);
    await deleteComment(member, comment);

    expectError(await deleteComment(member, comment), 404, 'Comment not found');
  });
});
