import { objectId, querySchema, stringField } from './common.js';

export const searchUsersSchema = {
  query: querySchema({
    q: stringField('Search query')
      .trim()
      .min(2, 'Search query must be at least 2 characters')
      .max(100, 'Search query must be at most 100 characters'),
    excludeTeam: objectId('team id').optional(),
  }),
};
