import { cursorQuery, querySchema } from './common.js';

export const activityFeedSchema = {
  query: querySchema(cursorQuery),
};
