import mongoose from 'mongoose';
import { Project, Task } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { TASK_PRIORITIES } from '../utils/constants.js';
import { DAY, buildDueFilter } from '../utils/dates.js';
import { containsRegex, paginate, sameId } from '../utils/query.js';
import { getAccessibleProjectIds } from './access.service.js';
import { TASK_POPULATE } from './serializers.js';

const { ObjectId } = mongoose.Types;

/** urgent -> low, used to sort by priority. */
const PRIORITY_RANK = [...TASK_PRIORITIES].reverse();

/** Search text shaped like a task key, e.g. `web-7` (project key + task number). */
const TASK_KEY_PATTERN = /^([A-Za-z][A-Za-z0-9]{1,5})-(\d+)$/;

/** Every sort ends with `_id` so pages are stable when the primary keys tie. */
const SORT_STAGES = {
  updated: { updatedAt: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  // `noDueDate` (0/1) pushes tasks without a due date to the end in both directions.
  due_asc: { noDueDate: 1, dueDate: 1, _id: 1 },
  due_desc: { noDueDate: 1, dueDate: -1, _id: -1 },
  priority: { priorityRank: 1, updatedAt: -1, _id: -1 },
};

/** Fields computed for sorting only, never returned. */
const INTERNAL_FIELDS = ['priorityRank', 'noDueDate', 'dueReminderSentAt', '__v'];

function assigneeCondition(assignee, user) {
  if (assignee === 'me') return { assignee: user._id };
  if (assignee === 'unassigned') return { assignee: null };
  return { assignee: new ObjectId(assignee) };
}

/**
 * Projects to search: the requested one (archived or not, if the user can access it), otherwise
 * every accessible project - active ones only unless `includeArchived`, so the results agree
 * with the dashboard, which only counts active projects.
 */
async function resolveProjectIds(user, { project, includeArchived }) {
  if (!project) return getAccessibleProjectIds(user._id, { activeOnly: !includeArchived });

  const accessibleIds = await getAccessibleProjectIds(user._id);
  if (!accessibleIds.some((id) => sameId(id, project))) {
    throw ApiError.forbidden('You do not have access to this project');
  }
  return [new ObjectId(project)];
}

/**
 * Free-text search: the title, the description or a label contains the text. Text shaped like a
 * task key (`web-7`) also finds that task; keys are only unique within a team, so the key may
 * name a task in several of the searched projects.
 */
async function searchCondition(search, projectIds) {
  const pattern = containsRegex(search);
  const matches = [{ title: pattern }, { description: pattern }, { labels: pattern }];

  const taskKey = TASK_KEY_PATTERN.exec(search);
  if (taskKey) {
    const [, projectKey, number] = taskKey;
    const keyProjectIds = await Project.find({
      _id: { $in: projectIds },
      key: projectKey.toUpperCase(),
    }).distinct('_id');
    if (keyProjectIds.length) {
      matches.push({ project: { $in: keyProjectIds }, number: Number(number) });
    }
  }
  return { $or: matches };
}

/**
 * Searches tasks across the projects the user can access (see `resolveProjectIds`).
 * Aggregation pipelines are not cast by Mongoose, so every id is converted to an ObjectId here.
 */
export async function searchTasks(user, query) {
  const { search, status, priority, assignee, due, completedWithin, sort, tzOffset } = query;
  const { skip, limit, meta } = paginate(query);
  const now = new Date();
  const projectIds = await resolveProjectIds(user, query);

  // Separate conditions combined with $and, so e.g. `status` and the `due=overdue` fragment
  // (which also constrains status) can never overwrite each other.
  const conditions = [{ project: { $in: projectIds } }];
  if (search) conditions.push(await searchCondition(search, projectIds));
  if (status) conditions.push(status === 'open' ? { status: { $ne: 'completed' } } : { status });
  if (priority) conditions.push({ priority });
  if (assignee) conditions.push(assigneeCondition(assignee, user));
  if (due) conditions.push(buildDueFilter(due, tzOffset, now));
  // A rolling window, like the dashboard's "completed this week" (open tasks have no completedAt).
  if (completedWithin) {
    conditions.push({ completedAt: { $gte: new Date(now.getTime() - completedWithin * DAY) } });
  }

  const [result] = await Task.aggregate([
    { $match: { $and: conditions } },
    {
      $addFields: {
        priorityRank: { $indexOfArray: [PRIORITY_RANK, '$priority'] },
        noDueDate: { $cond: [{ $eq: [{ $ifNull: ['$dueDate', null] }, null] }, 1, 0] },
      },
    },
    { $sort: SORT_STAGES[sort] },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }, { $unset: INTERNAL_FIELDS }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const items = await Task.populate(result.items, TASK_POPULATE);
  return { items, meta: meta(result.total[0]?.count ?? 0) };
}
