import { api, compactParams, unwrapPage } from './client';

/** Activity across all of the user's teams: `{ items, meta: { nextCursor, hasMore } }`. */
export async function getActivityFeed({ before, limit } = {}, { signal } = {}) {
  const params = compactParams({ before, limit });
  return unwrapPage(await api.get('/activity', { params, signal }));
}
