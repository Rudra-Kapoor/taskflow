/**
 * Who is currently viewing each project board.
 *
 *   projectId -> Map<userId, { user: UserPublic, socketIds: Set<socketId> }>
 *
 * A user stays "present" while at least one of their sockets (tabs) is in the room.
 * NOTE: this lives in process memory, so it only works for a single server instance.
 * Running several instances would need the Socket.IO Redis adapter plus a shared store
 * (e.g. Redis hashes) for presence.
 */
const viewersByProject = new Map();

/** Registers a socket as viewing a project. Returns true when the user just became present. */
export function addPresence(projectId, user, socketId) {
  const key = String(projectId);
  const userId = String(user._id);
  let viewers = viewersByProject.get(key);
  if (!viewers) {
    viewers = new Map();
    viewersByProject.set(key, viewers);
  }

  const entry = viewers.get(userId);
  if (entry) {
    entry.socketIds.add(socketId);
    return false;
  }
  viewers.set(userId, { user, socketIds: new Set([socketId]) });
  return true;
}

/** Removes one socket. Returns true when the user is no longer viewing the project. */
export function removePresence(projectId, userId, socketId) {
  const viewers = viewersByProject.get(String(projectId));
  const entry = viewers?.get(String(userId));
  if (!entry) return false;

  entry.socketIds.delete(socketId);
  if (entry.socketIds.size > 0) return false;

  viewers.delete(String(userId));
  if (viewers.size === 0) viewersByProject.delete(String(projectId));
  return true;
}

/** Removes a user from a project regardless of how many sockets they have open. */
export function removeUserPresence(projectId, userId) {
  const viewers = viewersByProject.get(String(projectId));
  if (!viewers?.delete(String(userId))) return false;
  if (viewers.size === 0) viewersByProject.delete(String(projectId));
  return true;
}

/**
 * Swaps in a user's new profile (UserPublic) wherever they are present, e.g. after a profile
 * edit. Returns the ids of the projects whose viewer list changed.
 */
export function updateUserPresence(user) {
  const userId = String(user._id);
  const projectIds = [];
  for (const [projectId, viewers] of viewersByProject) {
    const entry = viewers.get(userId);
    if (!entry) continue;
    entry.user = user;
    projectIds.push(projectId);
  }
  return projectIds;
}

export function clearPresence(projectId) {
  viewersByProject.delete(String(projectId));
}

/** Users currently viewing a project (UserPublic[]). */
export function listPresence(projectId) {
  const viewers = viewersByProject.get(String(projectId));
  return viewers ? [...viewers.values()].map((entry) => entry.user) : [];
}
