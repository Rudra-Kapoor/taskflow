import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { validate } from '../middleware/validate.js';
import {
  listNotificationsSchema,
  notificationParamsSchema,
} from '../validators/notification.validators.js';

const router = Router();

router.get('/', validate(listNotificationsSchema), notificationController.listNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch(
  '/:notificationId/read',
  validate(notificationParamsSchema),
  notificationController.markRead,
);
router.delete(
  '/:notificationId',
  validate(notificationParamsSchema),
  notificationController.deleteNotification,
);

export default router;
