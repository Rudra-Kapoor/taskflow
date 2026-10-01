import { Router } from 'express';
import * as commentController from '../controllers/comment.controller.js';
import { validate } from '../middleware/validate.js';
import { commentParamsSchema, updateCommentSchema } from '../validators/comment.validators.js';

const router = Router();

router
  .route('/:commentId')
  .patch(validate(updateCommentSchema), commentController.updateComment)
  .delete(validate(commentParamsSchema), commentController.deleteComment);

export default router;
