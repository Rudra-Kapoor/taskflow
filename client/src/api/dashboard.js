import { api, getTzOffset, unwrap } from './client';

/** Personal stats, breakdowns and upcoming tasks ("today" is the browser's local day). */
export async function getDashboard({ signal } = {}) {
  return unwrap(await api.get('/dashboard', { params: { tzOffset: getTzOffset() }, signal }));
}
