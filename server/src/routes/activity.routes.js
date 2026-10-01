import { Router } from 'express';
import * as activityController from '../controllers/activity.controller.js';
import { validate } from '../middleware/validate.js';
import { activityFeedSchema } from '../validators/activity.validators.js';

const router = Router();

router.get('/', validate(activityFeedSchema), activityController.listFeed);

export default router;
