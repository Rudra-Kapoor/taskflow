import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { validate } from '../middleware/validate.js';
import { dashboardSchema } from '../validators/dashboard.validators.js';

const router = Router();

router.get('/', validate(dashboardSchema), dashboardController.getDashboard);

export default router;
