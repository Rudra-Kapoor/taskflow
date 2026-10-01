import { querySchema, tzOffset } from './common.js';

export const dashboardSchema = {
  query: querySchema({ tzOffset }),
};
