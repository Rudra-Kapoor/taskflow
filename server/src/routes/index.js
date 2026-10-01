import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller.js';
import { authenticate } from '../middleware/auth.js';
import activityRoutes from './activity.routes.js';
import authRoutes from './auth.routes.js';
import commentRoutes from './comment.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import notificationRoutes from './notification.routes.js';
import projectRoutes from './project.routes.js';
import taskRoutes from './task.routes.js';
import teamRoutes from './team.routes.js';
import userRoutes from './user.routes.js';

/** Everything mounted under `/api`. Only health and register/login are public. */
const router = Router();

router.get('/health', healthCheck);
router.use('/auth', authRoutes);

router.use('/users', authenticate, userRoutes);
router.use('/teams', authenticate, teamRoutes);
router.use('/projects', authenticate, projectRoutes);
router.use('/tasks', authenticate, taskRoutes);
router.use('/comments', authenticate, commentRoutes);
router.use('/notifications', authenticate, notificationRoutes);
router.use('/activity', authenticate, activityRoutes);
router.use('/dashboard', authenticate, dashboardRoutes);

export default router;
