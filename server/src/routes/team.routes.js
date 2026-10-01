import { Router } from 'express';
import * as teamController from '../controllers/team.controller.js';
import { validate } from '../middleware/validate.js';
import {
  addMemberSchema,
  createTeamSchema,
  memberParamsSchema,
  teamParamsSchema,
  updateMemberRoleSchema,
  updateTeamSchema,
} from '../validators/team.validators.js';

const router = Router();

router
  .route('/')
  .get(teamController.listTeams)
  .post(validate(createTeamSchema), teamController.createTeam);

router
  .route('/:teamId')
  .get(validate(teamParamsSchema), teamController.getTeam)
  .patch(validate(updateTeamSchema), teamController.updateTeam)
  .delete(validate(teamParamsSchema), teamController.deleteTeam);

router.post('/:teamId/members', validate(addMemberSchema), teamController.addMember);

router
  .route('/:teamId/members/:userId')
  .patch(validate(updateMemberRoleSchema), teamController.updateMemberRole)
  .delete(validate(memberParamsSchema), teamController.removeMember);

export default router;
