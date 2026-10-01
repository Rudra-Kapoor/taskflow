import { z } from 'zod';
import { objectId, stringField } from './common.js';
import { taskParams } from './task.validators.js';

const commentBody = stringField('Comment')
  .trim()
  .min(1, 'Comment cannot be empty')
  .max(2000, 'Comment must be at most 2000 characters');

const commentParams = z.object({ commentId: objectId('comment id') });

export const addCommentSchema = {
  params: taskParams,
  body: z.object({ body: commentBody }),
};

export const updateCommentSchema = {
  params: commentParams,
  body: z.object({ body: commentBody }),
};

export const commentParamsSchema = { params: commentParams };
