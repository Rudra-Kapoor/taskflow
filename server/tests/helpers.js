import http from 'node:http';
import mongoose from 'mongoose';
import { io as connectClient } from 'socket.io-client';
import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../src/app.js';
import { getMemberTeamIds } from '../src/services/access.service.js';
import { getIO, rooms, setIO } from '../src/socket/emitter.js';
import { initSocket } from '../src/socket/index.js';

/* ------------------------------------------------------------------------------------------ */
/* HTTP                                                                                       */
/* ------------------------------------------------------------------------------------------ */

const DEFAULT_PASSWORD = 'Secret123';

/** A well-formed ObjectId that matches no document. */
export const MISSING_ID = '0123456789abcdef01234567';

/**
 * The Express app on a real port. Supertest reuses the listening server for every request
 * (instead of starting and stopping one per request). Closed by setup.js after each file.
 */
const apiServer = http.createServer(createApp());
await new Promise((resolve) => apiServer.listen(0, '127.0.0.1', resolve));

export const stopApiServer = () => new Promise((resolve) => apiServer.close(() => resolve()));

/** Supertest client for the API: `api.get('/api/teams').set(authHeader(user))`. */
export const api = request(apiServer);

export const authHeader = (userOrToken) => ({
  Authorization: `Bearer ${typeof userOrToken === 'string' ? userOrToken : userOrToken.token}`,
});

const describeResponse = (res) =>
  `${res.req?.method} ${res.req?.path} -> ${res.status} ${JSON.stringify(res.body)}`;

/** Asserts a successful envelope (`{ success: true, data }`) and returns its `data`. */
export function expectSuccess(res, status = 200) {
  expect(res.status, describeResponse(res)).toBe(status);
  expect(res.body.success).toBe(true);
  return res.body.data;
}

/** Asserts an error envelope (`{ success: false, message }`), optionally matching the message. */
export function expectError(res, status, message) {
  expect(res.status, describeResponse(res)).toBe(status);
  expect(res.body).toMatchObject({ success: false, message: expect.any(String) });
  if (message !== undefined) expect(res.body.message).toMatch(message);
}

/** Field names reported in a 400 response's `errors[]`. */
export const errorFields = (res) => (res.body.errors ?? []).map((error) => error.field);

/* ------------------------------------------------------------------------------------------ */
/* Factories                                                                                  */
/* ------------------------------------------------------------------------------------------ */

let sequence = 0;
const nextNumber = () => {
  sequence += 1;
  return sequence;
};

/** Registers an account. Returns the public user plus its `token` and plain `password`. */
export async function registerUser(overrides = {}) {
  const n = nextNumber();
  const body = {
    name: `User ${n}`,
    email: `user${n}@example.com`,
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
  const { user, token } = expectSuccess(await api.post('/api/auth/register').send(body), 201);
  return { ...user, token, password: body.password };
}

export async function createTeam(owner, overrides = {}) {
  const res = await api
    .post('/api/teams')
    .set(authHeader(owner))
    .send({ name: `Team ${nextNumber()}`, ...overrides });
  return expectSuccess(res, 201);
}

export async function addMember(actor, team, user, role = 'member') {
  const res = await api
    .post(`/api/teams/${team._id}/members`)
    .set(authHeader(actor))
    .send({ email: user.email, role });
  return expectSuccess(res, 201);
}

export async function createProject(actor, team, overrides = {}) {
  const n = nextNumber();
  const res = await api
    .post('/api/projects')
    .set(authHeader(actor))
    .send({ name: `Project ${n}`, key: `P${n}`, team: team._id, ...overrides });
  return expectSuccess(res, 201);
}

export async function archiveProject(actor, project) {
  const res = await api
    .patch(`/api/projects/${project._id}`)
    .set(authHeader(actor))
    .send({ status: 'archived' });
  return expectSuccess(res);
}

export async function createTask(actor, project, overrides = {}) {
  const res = await api
    .post(`/api/projects/${project._id}/tasks`)
    .set(authHeader(actor))
    .send({ title: `Task ${nextNumber()}`, ...overrides });
  return expectSuccess(res, 201);
}

export async function updateTask(actor, task, changes) {
  const res = await api.patch(`/api/tasks/${task._id}`).set(authHeader(actor)).send(changes);
  return expectSuccess(res);
}

export async function addComment(actor, task, body = 'Looks good to me!') {
  const res = await api
    .post(`/api/tasks/${task._id}/comments`)
    .set(authHeader(actor))
    .send({ body });
  return expectSuccess(res, 201);
}

/**
 * A team with one user per role and a project:
 * `owner` (creator), `admin`, `member`, plus an `outsider` who belongs to no team.
 */
export async function createWorkspace() {
  const [owner, admin, member, outsider] = await Promise.all([
    registerUser({ name: 'Olivia Owner' }),
    registerUser({ name: 'Adam Admin' }),
    registerUser({ name: 'Mia Member' }),
    registerUser({ name: 'Oscar Outsider' }),
  ]);
  const team = await createTeam(owner, { name: 'Product Engineering' });
  await addMember(owner, team, admin, 'admin');
  await addMember(owner, team, member, 'member');
  const project = await createProject(owner, team, { name: 'TaskFlow Web App', key: 'WEB' });
  return { owner, admin, member, outsider, team, project };
}

/* ------------------------------------------------------------------------------------------ */
/* Database                                                                                   */
/* ------------------------------------------------------------------------------------------ */

/** Empties every collection (indexes are kept). */
export async function resetDatabase() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

/* ------------------------------------------------------------------------------------------ */
/* Dates                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** India Standard Time, as reported by `new Date().getTimezoneOffset()` in the browser. */
export const IST = -330;

export const isoDate = (ms) => new Date(ms).toISOString();

/**
 * UTC instant (ms) at which the local calendar day containing `now` starts, for a timezone
 * offset in the JS `getTimezoneOffset()` convention. Computed independently of src/utils/dates.js.
 */
export function localDayStart(tzOffset, now = Date.now()) {
  const wallClock = new Date(now - tzOffset * MINUTE);
  const midnight = Date.UTC(
    wallClock.getUTCFullYear(),
    wallClock.getUTCMonth(),
    wallClock.getUTCDate(),
  );
  return midnight + tzOffset * MINUTE;
}

/**
 * An instant that belongs to "today" in India but not to "today" in UTC: the two calendar days
 * only partly overlap, so the middle of the non-overlapping part is picked.
 */
export function todayInIndiaOnly(now = Date.now()) {
  const istStart = localDayStart(IST, now);
  const utcStart = localDayStart(0, now);
  const midpoint = (istStart + utcStart) / 2;
  return istStart < utcStart ? midpoint : midpoint + DAY;
}

/* ------------------------------------------------------------------------------------------ */
/* Waiting                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Upper bound for explicit waits; a passing wait resolves as soon as its condition holds. */
const DEFAULT_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 10;

/** Polls `condition` until it returns a truthy value (explicit wait, never a fixed sleep). */
export async function waitUntil(condition, description, timeout = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const result = await condition();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`Timed out after ${timeout}ms: ${description}`);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Real-time                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const openSockets = new Set();

/**
 * Boots the API + Socket.IO on a random port with the same wiring as src/index.js (the database
 * connection comes from setup.js). Services publish through this server until `close()`.
 */
export async function startRealtimeServer() {
  const httpServer = http.createServer(createApp());
  const io = initSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));

  return {
    url: `http://127.0.0.1:${httpServer.address().port}`,
    io,
    close: async () => {
      closeSockets();
      setIO(null);
      // Disconnects every socket and closes the HTTP server.
      await new Promise((resolve) => io.close(() => resolve()));
    },
  };
}

/**
 * The server joins a socket's team rooms asynchronously (after a membership query), so an event
 * emitted right after the handshake could be missed. Waits until the server-side socket is in
 * its personal room and the room of every team the user belongs to.
 */
async function waitForDefaultRooms(socket) {
  const serverSocket = () => getIO()?.of('/').sockets.get(socket.id);
  const { user } = (await waitUntil(serverSocket, 'server-side socket')).data;
  const teamIds = await getMemberTeamIds(user._id);
  const expected = [rooms.user(user._id), ...teamIds.map((teamId) => rooms.team(teamId))];

  await waitUntil(
    () => expected.every((room) => serverSocket()?.rooms.has(room)),
    `socket of ${user.name} to join ${expected.join(', ')}`,
  );
}

/**
 * Opens a Socket.IO client authenticated with `token` (omit it to connect anonymously).
 * Resolves once the socket is connected and subscribed to its default rooms; rejects with the
 * server's `connect_error`.
 */
export async function connectSocket(url, token) {
  const socket = connectClient(url, {
    auth: token === undefined ? {} : { token },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
  openSockets.add(socket);

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
  await waitForDefaultRooms(socket);
  return socket;
}

/** Closes every socket opened with `connectSocket`. */
export function closeSockets() {
  for (const socket of openSockets) socket.close();
  openSockets.clear();
}

/**
 * Resolves with the payload of the next `event` that satisfies `predicate`.
 * Call it BEFORE triggering the action so the event cannot be missed.
 */
export function waitForEvent(socket, event, predicate = () => true, timeout = DEFAULT_TIMEOUT_MS) {
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timed out after ${timeout}ms waiting for "${event}"`));
    }, timeout);

    function listener(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    }
    socket.on(event, listener);
  });
  // The test may fail before awaiting the promise; don't report that as an unhandled rejection.
  promise.catch(() => {});
  return promise;
}

/** `project:join` with its acknowledgement (`{ ok, users }` or `{ ok: false, message }`). */
export const joinProject = (socket, projectId) =>
  socket.timeout(DEFAULT_TIMEOUT_MS).emitWithAck('project:join', projectId);

/**
 * Completes a request/acknowledgement round trip. Socket.IO delivers the packets of one
 * connection in order, so afterwards every event the server emitted to this socket before the
 * round trip has been received. (`project:join` with an invalid id is answered immediately and
 * has no side effects.)
 */
export async function flushSocket(socket) {
  await joinProject(socket, 'flush');
}

/**
 * Records every `event` received while `action` runs, then flushes the socket so that late
 * deliveries are included. Used to prove that an event was NOT delivered, without sleeping.
 */
export async function collectEvents(socket, event, action) {
  const [received] = await collectEventsFrom([socket], event, action);
  return received;
}

/** `collectEvents` for several sockets at once: one list of received payloads per socket. */
export async function collectEventsFrom(sockets, event, action) {
  const received = sockets.map(() => []);
  const listeners = received.map((payloads) => (payload) => payloads.push(payload));
  sockets.forEach((socket, index) => socket.on(event, listeners[index]));
  try {
    await action();
    await Promise.all(sockets.map(flushSocket));
  } finally {
    sockets.forEach((socket, index) => socket.off(event, listeners[index]));
  }
  return received;
}
