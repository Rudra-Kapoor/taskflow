import { z } from 'zod';
import { booleanString, objectId, pageQuery, querySchema } from './common.js';

export const listNotificationsSchema = {
  query: querySchema({
    unread: booleanString.optional(),
    ...pageQuery,
  }),
};

export const notificationParamsSchema = {
  params: z.object({ notificationId: objectId('notification id') }),
};
