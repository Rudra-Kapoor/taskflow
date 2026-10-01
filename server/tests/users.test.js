import { beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  api,
  authHeader,
  createTeam,
  errorFields,
  expectError,
  expectSuccess,
  registerUser,
  resetDatabase,
} from './helpers.js';

let me;
let rahul;
let priyanka;
let ravi;
let myTeam;

const searchUsers = (user, query) =>
  api.get('/api/users/search').query(query).set(authHeader(user));

const namesFound = async (user, query) =>
  expectSuccess(await searchUsers(user, query)).map((found) => found.name);

/*
 * Rahul shares my team, Priyanka has added me to hers; Ravi shares no team with me.
 */
beforeEach(async () => {
  await resetDatabase();
  [me, rahul, priyanka, ravi] = await Promise.all([
    registerUser({ name: 'Priya Patel', email: 'priya@example.com' }),
    registerUser({ name: 'Rahul Verma', email: 'rahul@example.com' }),
    registerUser({ name: 'Priyanka Rao', email: 'p.rao@example.com' }),
    registerUser({ name: 'Ravi Kumar', email: 'ravi@corp.dev' }),
  ]);
  myTeam = await createTeam(me);
  await addMember(me, myTeam, rahul);
  await addMember(priyanka, await createTeam(priyanka), me);
});

describe('GET /api/users/search', () => {
  it('matches teammates by name or email, ignoring case, sorted by name, never me', async () => {
    expect(await namesFound(me, { q: 'PRI' })).toEqual(['Priyanka Rao']);
    expect(await namesFound(me, { q: 'example.com' })).toEqual(['Priyanka Rao', 'Rahul Verma']);
    expect(await namesFound(me, { q: 'ra' })).toEqual(['Priyanka Rao', 'Rahul Verma']);
  });

  it('never reveals people outside my teams through partial matches', async () => {
    expect(await namesFound(me, { q: 'ravi' })).toEqual([]);
    expect(await namesFound(me, { q: 'corp.dev' })).toEqual([]);
    expect(await namesFound(me, { q: 'ravi@corp.de' })).toEqual([]);
    // Someone without any team cannot browse the directory either.
    expect(await namesFound(ravi, { q: 'example.com' })).toEqual([]);
  });

  it('finds anyone by their exact email address, regardless of case', async () => {
    expect(await namesFound(me, { q: 'RAVI@corp.dev' })).toEqual(['Ravi Kumar']);
    expect(await namesFound(ravi, { q: 'priya@example.com' })).toEqual(['Priya Patel']);
  });

  it('lists an exact email match first, then the matching teammates', async () => {
    const zoe = await registerUser({ name: 'Zoe Zhang', email: 'ra@corp.dev' });
    const kara = await registerUser({ name: 'Kara Lee', email: 'kara@corp.dev' });
    await addMember(me, myTeam, kara);

    expect(await namesFound(me, { q: zoe.email })).toEqual(['Zoe Zhang', 'Kara Lee']);
  });

  it('returns public profiles only', async () => {
    const [found] = expectSuccess(await searchUsers(me, { q: 'rahul' }));

    expect(Object.keys(found).sort()).toEqual(['_id', 'avatarColor', 'email', 'name', 'title']);
  });

  it('can hide the people who are already in a team, exact email matches included', async () => {
    expect(await namesFound(me, { q: 'ra', excludeTeam: myTeam._id })).toEqual(['Priyanka Rao']);
    expect(await namesFound(me, { q: rahul.email, excludeTeam: myTeam._id })).toEqual([]);
  });

  it('returns at most 8 people', async () => {
    const zeds = await Promise.all(
      Array.from({ length: 10 }, (_, i) => registerUser({ name: `Zed ${i}` })),
    );
    for (const zed of zeds) await addMember(me, myTeam, zed);

    expect(await namesFound(me, { q: 'zed' })).toHaveLength(8);
  });

  it('requires at least 2 characters and a team the user belongs to', async () => {
    const othersTeam = await createTeam(rahul);

    const tooShort = await searchUsers(me, { q: 'r' });
    const foreignTeam = await searchUsers(me, { q: 'ra', excludeTeam: othersTeam._id });

    expectError(tooShort, 400);
    expect(errorFields(tooShort)).toEqual(['q']);
    expectError(foreignTeam, 403);
  });
});
