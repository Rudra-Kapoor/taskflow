import { api, path, unwrap, unwrapMessage } from './client';

export async function getTeams({ signal } = {}) {
  return unwrap(await api.get('/teams', { signal }));
}

export async function getTeam(id, { signal } = {}) {
  return unwrap(await api.get(path`/teams/${id}`, { signal }));
}

export async function createTeam(data) {
  return unwrap(await api.post('/teams', data));
}

export async function updateTeam(id, data) {
  return unwrap(await api.patch(path`/teams/${id}`, data));
}

export async function deleteTeam(id) {
  return unwrapMessage(await api.delete(path`/teams/${id}`));
}

/** Adds an existing account by email; resolves with the updated team. */
export async function addMember(teamId, { email, role }) {
  return unwrap(await api.post(path`/teams/${teamId}/members`, { email, role }));
}

/** Resolves with the updated team. */
export async function updateMemberRole(teamId, userId, role) {
  return unwrap(await api.patch(path`/teams/${teamId}/members/${userId}`, { role }));
}

/** Removes a member (or leaves the team when `userId` is the current user). */
export async function removeMember(teamId, userId) {
  return unwrapMessage(await api.delete(path`/teams/${teamId}/members/${userId}`));
}
