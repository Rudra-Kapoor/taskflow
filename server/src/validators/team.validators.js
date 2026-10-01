import { z } from 'zod';
import { TEAM_ROLES } from '../utils/constants.js';
import { atLeastOneField, emailSchema, enumField, objectId, stringField } from './common.js';

/** The owner role is never granted through the API (it belongs to the team creator). */
const ASSIGNABLE_ROLES = TEAM_ROLES.filter((role) => role !== 'owner');

const teamName = stringField('Team name')
  .trim()
  .min(2, 'Team name must be at least 2 characters')
  .max(80, 'Team name must be at most 80 characters');

const teamDescription = stringField('Description')
  .trim()
  .max(500, 'Description must be at most 500 characters');

const role = enumField(ASSIGNABLE_ROLES, 'Role');

const teamParams = z.object({ teamId: objectId('team id') });
const memberParams = teamParams.extend({ userId: objectId('user id') });

export const teamParamsSchema = { params: teamParams };

export const createTeamSchema = {
  body: z.object({
    name: teamName,
    description: teamDescription.default(''),
  }),
};

export const updateTeamSchema = {
  params: teamParams,
  body: atLeastOneField(
    z.object({
      name: teamName.optional(),
      description: teamDescription.optional(),
    }),
  ),
};

export const addMemberSchema = {
  params: teamParams,
  body: z.object({
    email: emailSchema,
    role: role.default('member'),
  }),
};

export const updateMemberRoleSchema = {
  params: memberParams,
  body: z.object({ role }),
};

export const memberParamsSchema = { params: memberParams };
