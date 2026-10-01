import { api, compactParams, unwrap } from './client';

/** Users matching `q` (name or email, min 2 chars), optionally hiding members of `excludeTeam`. */
export async function searchUsers({ q, excludeTeam } = {}, { signal } = {}) {
  const params = compactParams({ q, excludeTeam });
  return unwrap(await api.get('/users/search', { params, signal }));
}
