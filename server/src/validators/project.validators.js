import { z } from 'zod';
import { PROJECT_STATUSES } from '../utils/constants.js';
import {
  atLeastOneField,
  cursorQuery,
  enumField,
  hexColor,
  objectId,
  querySchema,
  stringField,
} from './common.js';

const projectName = stringField('Project name')
  .trim()
  .min(2, 'Project name must be at least 2 characters')
  .max(100, 'Project name must be at most 100 characters');

const projectKey = stringField('Project key')
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9]{1,5}$/, 'Key must be 2-6 letters or digits and start with a letter');

const projectDescription = stringField('Description')
  .trim()
  .max(1000, 'Description must be at most 1000 characters');

const projectStatus = enumField(PROJECT_STATUSES, 'Status');

export const projectParams = z.object({ projectId: objectId('project id') });

export const projectParamsSchema = { params: projectParams };

export const listProjectsSchema = {
  query: querySchema({
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
    team: objectId('team id').optional(),
    status: enumField([...PROJECT_STATUSES, 'all'], 'Status').default('active'),
  }),
};

export const createProjectSchema = {
  body: z.object({
    name: projectName,
    key: projectKey,
    team: objectId('team'),
    description: projectDescription.default(''),
    color: hexColor.optional(),
  }),
};

export const updateProjectSchema = {
  params: projectParams,
  body: atLeastOneField(
    z.object({
      name: projectName.optional(),
      key: projectKey.optional(),
      description: projectDescription.optional(),
      color: hexColor.optional(),
      status: projectStatus.optional(),
    }),
  ),
};

export const projectActivitySchema = {
  params: projectParams,
  query: querySchema(cursorQuery),
};
