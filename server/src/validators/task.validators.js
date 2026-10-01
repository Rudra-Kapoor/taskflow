import { z } from 'zod';
import { DUE_FILTERS, TASK_PRIORITIES, TASK_SORTS, TASK_STATUSES } from '../utils/constants.js';
import {
  OBJECT_ID_PATTERN,
  atLeastOneField,
  booleanString,
  cursorQuery,
  enumField,
  isIsoDate,
  objectId,
  pageQuery,
  querySchema,
  stringField,
  tzOffset,
} from './common.js';
import { projectParams } from './project.validators.js';

const MAX_LABELS = 10;
const DUE_YEARS = { min: 2000, max: 2100 };
const DUE_DATE_FORMAT =
  'Due date must be an ISO 8601 date (YYYY-MM-DD) or date-time with a timezone (Z or +hh:mm)';

const title = stringField('Title')
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters');

const description = stringField('Description')
  .trim()
  .max(5000, 'Description must be at most 5000 characters')
  .nullable()
  .transform((value) => value ?? '');

const status = enumField(TASK_STATUSES, 'Status');
const priority = enumField(TASK_PRIORITIES, 'Priority');

/** `null` unassigns the task. */
const assignee = objectId('assignee').nullable();

/**
 * An ISO 8601 date-time with `Z` or an offset (the web client sends the end of the chosen local
 * day) or a plain `YYYY-MM-DD` date (midnight UTC), within a sane range of years. `null` (or an
 * empty string from a cleared date input) removes the due date.
 */
const dueDate = z.preprocess(
  (value) => (value === '' ? null : value),
  z
    .string({ invalid_type_error: DUE_DATE_FORMAT })
    .superRefine((value, ctx) => {
      if (!isIsoDate(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: DUE_DATE_FORMAT });
        return;
      }
      // Both formats start with the four-digit year the user picked.
      const year = Number(value.slice(0, 4));
      if (year < DUE_YEARS.min || year > DUE_YEARS.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Due date must be between the years ${DUE_YEARS.min} and ${DUE_YEARS.max}`,
        });
      }
    })
    .transform((value) => new Date(value))
    .nullable(),
);

const label = stringField('Label')
  .trim()
  .toLowerCase()
  .min(1, 'Labels cannot be empty')
  .max(30, 'Labels must be at most 30 characters');

const labels = z
  .array(label, { invalid_type_error: 'Labels must be an array of strings' })
  .transform((values) => [...new Set(values)])
  .refine((values) => values.length <= MAX_LABELS, `A task can have at most ${MAX_LABELS} labels`);

export const taskParams = z.object({ taskId: objectId('task id') });

export const taskParamsSchema = { params: taskParams };

export const createTaskSchema = {
  params: projectParams,
  body: z.object({
    title,
    description: description.default(''),
    status: status.default('todo'),
    priority: priority.default('medium'),
    assignee: assignee.default(null),
    dueDate: dueDate.default(null),
    labels: labels.default([]),
  }),
};

export const updateTaskSchema = {
  params: taskParams,
  body: atLeastOneField(
    z.object({
      title: title.optional(),
      description: description.optional(),
      status: status.optional(),
      priority: priority.optional(),
      assignee: assignee.optional(),
      dueDate: dueDate.optional(),
      labels: labels.optional(),
    }),
  ),
};

export const moveTaskSchema = {
  params: taskParams,
  body: z
    .object({
      status,
      prevTaskId: objectId('prevTaskId').nullish(),
      nextTaskId: objectId('nextTaskId').nullish(),
    })
    .refine((data) => !data.prevTaskId || data.prevTaskId !== data.nextTaskId, {
      path: ['nextTaskId'],
      message: 'prevTaskId and nextTaskId must be different tasks',
    }),
};

export const searchTasksSchema = {
  query: querySchema({
    search: z.string().trim().max(200, 'Search must be at most 200 characters').optional(),
    project: objectId('project id').optional(),
    // Without an explicit `project`, only active projects are searched unless this is true.
    includeArchived: booleanString.optional(),
    status: enumField([...TASK_STATUSES, 'open'], 'Status').optional(),
    priority: priority.optional(),
    assignee: z
      .string()
      .trim()
      .toLowerCase()
      .refine(
        (value) => value === 'me' || value === 'unassigned' || OBJECT_ID_PATTERN.test(value),
        'Assignee must be "me", "unassigned" or a user id',
      )
      .optional(),
    due: enumField(DUE_FILTERS, 'Due').optional(),
    // Tasks completed within the last N days (rolling window), e.g. 7 for "this week".
    completedWithin: z.coerce
      .number({ invalid_type_error: 'completedWithin must be a number of days' })
      .int('completedWithin must be a whole number of days')
      .min(1, 'completedWithin must be between 1 and 365')
      .max(365, 'completedWithin must be between 1 and 365')
      .optional(),
    sort: enumField(TASK_SORTS, 'Sort').default('updated'),
    tzOffset,
    ...pageQuery,
  }),
};

export const taskActivitySchema = {
  params: taskParams,
  query: querySchema(cursorQuery),
};
