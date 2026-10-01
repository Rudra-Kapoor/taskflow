import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { searchUsersSchema } from '../validators/user.validators.js';

const router = Router();

router.get('/search', validate(searchUsersSchema), userController.searchUsers);

export default router;
