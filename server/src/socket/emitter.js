import { SERVER_EVENTS } from './events.js';
import { clearPresence, listPresence, removeUserPresence, updateUserPresence } from './presence.js';

/**
 * Thin facade over the Socket.IO server so services can publish real-time events without
 * knowing about sockets. Every helper is a no-op until `setIO()` has been called, which keeps
 * the HTTP layer usable on its own (e.g. in tests that only use supertest).
 */
let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;

export const rooms = Object.freeze({
  user: (userId) => `user:${userId}`,
  team: (teamId) => `team:${teamId}`,
  project: (projectId) => `project:${projectId}`,
});

const PROJECT_ROOM_PREFIX = rooms.project('');

/** Extracts the project id from a `project:<id>` room name (null for other rooms). */
export const projectIdFromRoom = (room) =>
  room.startsWith(PROJECT_ROOM_PREFIX) ? room.slice(PROJECT_ROOM_PREFIX.length) : null;

export function emitToUser(userId, event, payload) {
  io?.to(rooms.user(userId)).emit(event, payload);
}

export function emitToTeam(teamId, event, payload) {
  io?.to(rooms.team(teamId)).emit(event, payload);
}

export function emitToProject(projectId, event, payload) {
  io?.to(rooms.project(projectId)).emit(event, payload);
}

/**
 * Emits to a user's own sockets and to every member of the given teams. A socket that is in
 * several of these rooms receives the event once.
 */
export function emitToUserAndTeams(userId, teamIds, event, payload) {
  const audience = [rooms.user(userId), ...teamIds.map((teamId) => rooms.team(teamId))];
  io?.to(audience).emit(event, payload);
}

/** Sends the current viewer list of a project to everyone in its room. */
export function broadcastPresence(projectId) {
  emitToProject(projectId, SERVER_EVENTS.PRESENCE_UPDATE, {
    projectId: String(projectId),
    users: listPresence(projectId),
  });
}

/**
 * Applies a user's edited profile (UserPublic) to their live state on this server: their open
 * sockets carry it into later `project:join`s, and the boards they are viewing re-broadcast their
 * viewer list.
 */
export function refreshUserProfile(profile) {
  if (!io) return;
  const namespace = io.of('/');
  for (const socketId of namespace.adapter.rooms.get(rooms.user(profile._id)) ?? []) {
    const socket = namespace.sockets.get(socketId);
    if (socket) socket.data.user = profile;
  }
  for (const projectId of updateUserPresence(profile)) broadcastPresence(projectId);
}

/**
 * Closes every open socket of a user whose sessions were revoked (password change). Their
 * presence is cleared by the regular `disconnecting` handler, and reconnecting needs a new token.
 */
export function disconnectUser(userId) {
  io?.in(rooms.user(userId)).disconnectSockets(true);
}

/** Subscribes every open socket of a user to a team room (after creating / joining a team). */
export function joinUserToTeam(userId, teamId) {
  io?.in(rooms.user(userId)).socketsJoin(rooms.team(teamId));
}

/**
 * Cuts a user off from a team they no longer belong to: their sockets leave the team room and
 * every project room of that team, and they disappear from those boards' presence lists.
 */
export function evictUserFromTeam(userId, teamId, projectIds = []) {
  if (!io) return;
  const projectRooms = projectIds.map((projectId) => rooms.project(projectId));
  io.in(rooms.user(userId)).socketsLeave([rooms.team(teamId), ...projectRooms]);

  for (const projectId of projectIds) {
    if (removeUserPresence(projectId, userId)) broadcastPresence(projectId);
  }
}

/** Empties a project room (the project was deleted). */
export function closeProjectRoom(projectId) {
  io?.in(rooms.project(projectId)).socketsLeave(rooms.project(projectId));
  clearPresence(projectId);
}

/** Empties a team room and all of its project rooms (the team was deleted). */
export function closeTeamRooms(teamId, projectIds = []) {
  io?.in(rooms.team(teamId)).socketsLeave(rooms.team(teamId));
  projectIds.forEach(closeProjectRoom);
}
