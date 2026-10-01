import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { getMemberTeamIds, loadProjectForMember } from '../services/access.service.js';
import { toUserPublic } from '../services/serializers.js';
import { USER_PUBLIC_FIELDS } from '../utils/constants.js';
import { isTokenCurrent, verifyToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { OBJECT_ID_PATTERN } from '../validators/common.js';
import { broadcastPresence, projectIdFromRoom, rooms, setIO } from './emitter.js';
import { CLIENT_EVENTS } from './events.js';
import { addPresence, listPresence, removePresence } from './presence.js';

const INVALID_TOKEN_ERRORS = new Set(['JsonWebTokenError', 'TokenExpiredError', 'CastError']);

/**
 * Heartbeat: every connection is pinged every 10 s and closed when the pong is not back within
 * 5 s. Dead connections (closed laptop, lost network) - and their board presence - are dropped
 * within ~15 s instead of ~45 s with Socket.IO's defaults (25 s + 20 s). Clients receive both
 * values in the handshake and notice a dead server just as fast.
 */
const PING_INTERVAL_MS = 10_000;
const PING_TIMEOUT_MS = 5_000;

/**
 * Handshake middleware: `io(url, { auth: { token } })` -> `socket.data.user` (UserPublic).
 * Team memberships are resolved here too, so default rooms can be joined synchronously the
 * moment the connection opens (no window in which team events are missed).
 */
async function authenticateSocket(socket, next) {
  const { token } = socket.handshake.auth ?? {};
  if (!token || typeof token !== 'string') return next(new Error('Authentication required'));

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub)
      .select(`${USER_PUBLIC_FIELDS} tokenVersion`)
      .lean();
    // Unknown account, or a token revoked by a password change.
    if (!user || !isTokenCurrent(payload, user)) return next(new Error('Invalid or expired token'));

    // `socket.data.user` is broadcast in presence lists, so it must stay a plain UserPublic.
    // A profile edit replaces it (see `refreshUserProfile`).
    socket.data.user = toUserPublic(user);
    socket.data.teamIds = (await getMemberTeamIds(user._id)).map(String);
    return next();
  } catch (error) {
    if (INVALID_TOKEN_ERRORS.has(error.name)) return next(new Error('Invalid or expired token'));
    logger.error('Socket authentication failed', error);
    return next(new Error('Unable to authenticate. Please try again.'));
  }
}

const parseProjectId = (value) =>
  typeof value === 'string' && OBJECT_ID_PATTERN.test(value) ? value.toLowerCase() : null;

const LEFT_BEFORE_JOINED = 'Left the project before the join completed';

function registerHandlers(socket) {
  // Only the id is captured: the profile in `socket.data.user` is replaced when it is edited.
  const userId = socket.data.user._id;
  // Boards this socket asked to view and has not left since. A join only takes effect if it is
  // still wanted once membership has been checked, so a `project:leave` that arrives during the
  // check is never lost, and join -> leave -> join (React StrictMode) still ends up joined.
  socket.data.projects = new Set();

  socket.on(CLIENT_EVENTS.PROJECT_JOIN, async (rawProjectId, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const projectId = parseProjectId(rawProjectId);
    if (!projectId) return reply({ ok: false, message: 'Invalid project id' });

    socket.data.projects.add(projectId);
    try {
      await loadProjectForMember(projectId, userId);
    } catch (error) {
      // Refused joins are forgotten, so the set only ever holds boards the user may view.
      socket.data.projects.delete(projectId);
      if (!error.isOperational) logger.error('project:join failed', error);
      return reply({
        ok: false,
        message: error.isOperational ? error.message : 'Unable to join the project',
      });
    }

    // The socket may have disconnected, or left the board, while membership was being checked.
    if (socket.disconnected || !socket.data.projects.has(projectId)) {
      return reply({ ok: false, message: LEFT_BEFORE_JOINED });
    }

    socket.join(rooms.project(projectId));
    if (addPresence(projectId, socket.data.user, socket.id)) broadcastPresence(projectId);
    return reply({ ok: true, users: listPresence(projectId) });
  });

  socket.on(CLIENT_EVENTS.PROJECT_LEAVE, (rawProjectId) => {
    const projectId = parseProjectId(rawProjectId);
    if (!projectId) return;

    socket.data.projects.delete(projectId);
    socket.leave(rooms.project(projectId));
    if (removePresence(projectId, userId, socket.id)) broadcastPresence(projectId);
  });

  // `socket.rooms` is still populated while disconnecting (it is empty after `disconnect`).
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      const projectId = projectIdFromRoom(room);
      if (projectId && removePresence(projectId, userId, socket.id)) {
        broadcastPresence(projectId);
      }
    }
  });
}

/** Personal room + one room per team, so team-wide events reach every member. */
function joinDefaultRooms(socket) {
  const { user, teamIds } = socket.data;
  socket.join([rooms.user(user._id), ...teamIds.map((teamId) => rooms.team(teamId))]);
}

/**
 * Memberships were read during the handshake; a removal that landed in between could not evict
 * this socket yet (it wasn't in its user room). Re-reading once after joining closes that gap.
 */
async function reconcileTeamRooms(socket) {
  const { user, teamIds } = socket.data;
  try {
    const current = new Set((await getMemberTeamIds(user._id)).map(String));
    for (const teamId of teamIds) {
      if (!current.has(teamId)) socket.leave(rooms.team(teamId));
    }
  } catch (error) {
    logger.error(`Could not verify team rooms for user ${user._id}`, error);
  }
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    path: env.socketPath,
    cors: { origin: env.clientOrigins, credentials: true },
    pingInterval: PING_INTERVAL_MS,
    pingTimeout: PING_TIMEOUT_MS,
  });

  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    // Handlers and default rooms are set up synchronously so no early event can be missed.
    registerHandlers(socket);
    joinDefaultRooms(socket);
    reconcileTeamRooms(socket);
  });

  setIO(io);
  return io;
}
