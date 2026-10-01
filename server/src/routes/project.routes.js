import { Router } from 'express';
import * as activityController from '../controllers/activity.controller.js';
import * as projectController from '../controllers/project.controller.js';
import * as taskController from '../controllers/task.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createProjectSchema,
  listProjectsSchema,
  projectActivitySchema,
  projectParamsSchema,
  updateProjectSchema,
} from '../validators/project.validators.js';
import { createTaskSchema } from '../validators/task.validators.js';

const router = Router();

router
  .route('/')
  .get(validate(listProjectsSchema), projectController.listProjects)
  .post(validate(createProjectSchema), projectController.createProject);

router
  .route('/:projectId')
  .get(validate(projectParamsSchema), projectController.getProject)
  .patch(validate(updateProjectSchema), projectController.updateProject)
  .delete(validate(projectParamsSchema), projectController.deleteProject);

router
  .route('/:projectId/tasks')
  .get(validate(projectParamsSchema), taskController.listProjectTasks)
  .post(validate(createTaskSchema), taskController.createTask);

router.get(
  '/:projectId/activity',
  validate(projectActivitySchema),
  activityController.listProjectActivity,
);

export default router;
