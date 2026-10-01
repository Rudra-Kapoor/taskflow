import { Router } from 'express';
import * as activityController from '../controllers/activity.controller.js';
import * as commentController from '../controllers/comment.controller.js';
import * as taskController from '../controllers/task.controller.js';
import { validate } from '../middleware/validate.js';
import { addCommentSchema } from '../validators/comment.validators.js';
import {
  moveTaskSchema,
  searchTasksSchema,
  taskActivitySchema,
  taskParamsSchema,
  updateTaskSchema,
} from '../validators/task.validators.js';

const router = Router();

router.get('/', validate(searchTasksSchema), taskController.searchTasks);

router
  .route('/:taskId')
  .get(validate(taskParamsSchema), taskController.getTask)
  .patch(validate(updateTaskSchema), taskController.updateTask)
  .delete(validate(taskParamsSchema), taskController.deleteTask);

router.patch('/:taskId/move', validate(moveTaskSchema), taskController.moveTask);

router
  .route('/:taskId/comments')
  .get(validate(taskParamsSchema), commentController.listComments)
  .post(validate(addCommentSchema), commentController.addComment);

router.get('/:taskId/activity', validate(taskActivitySchema), activityController.listTaskActivity);

export default router;
