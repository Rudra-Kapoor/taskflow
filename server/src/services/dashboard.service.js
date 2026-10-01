import { Project, Task } from '../models/index.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../utils/constants.js';
import { DAY, buildDueFilter } from '../utils/dates.js';
import { getMemberTeamIds } from './access.service.js';
import { TASK_POPULATE } from './serializers.js';

const UPCOMING_LIMIT = 6;
const OPEN = { status: { $ne: 'completed' } };

/** `{ todo: 3, in_progress: 1, completed: 0 }` from `$group` rows, with every key present. */
const toBreakdown = (keys, rows) => {
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return Object.fromEntries(keys.map((key) => [key, counts.get(key) ?? 0]));
};

const countBy = (match, field) =>
  Task.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);

/** Nearest due date first; tasks without a due date only fill the remaining slots. */
async function findUpcomingTasks(filter) {
  const withDueDate = await Task.find({ ...filter, dueDate: { $ne: null } })
    .sort({ dueDate: 1, _id: 1 })
    .limit(UPCOMING_LIMIT)
    .populate(TASK_POPULATE);
  if (withDueDate.length === UPCOMING_LIMIT) return withDueDate;

  const withoutDueDate = await Task.find({ ...filter, dueDate: null })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(UPCOMING_LIMIT - withDueDate.length)
    .populate(TASK_POPULATE);
  return [...withDueDate, ...withoutDueDate];
}

/**
 * Personal overview. Task figures cover the user's active projects (archived projects are
 * read-only, so their tasks are not actionable); "today" is the user's local day.
 */
export async function getDashboard(user, { tzOffset }) {
  const now = new Date();
  const teamIds = await getMemberTeamIds(user._id);
  const projectIds = teamIds.length
    ? await Project.find({ team: { $in: teamIds }, status: 'active' }).distinct('_id')
    : [];

  const inMyProjects = { project: { $in: projectIds } };
  const mine = { ...inMyProjects, assignee: user._id };
  const mineOpen = { ...mine, ...OPEN };

  const [
    assignedOpen,
    overdue,
    dueToday,
    completedThisWeek,
    statusRows,
    priorityRows,
    upcomingTasks,
  ] = await Promise.all([
    Task.countDocuments(mineOpen),
    Task.countDocuments({ ...mine, ...buildDueFilter('overdue', tzOffset, now) }),
    Task.countDocuments({ ...mineOpen, ...buildDueFilter('today', tzOffset, now) }),
    Task.countDocuments({
      ...mine,
      status: 'completed',
      completedAt: { $gte: new Date(now.getTime() - 7 * DAY) },
    }),
    countBy(inMyProjects, 'status'),
    countBy(mineOpen, 'priority'),
    findUpcomingTasks(mineOpen),
  ]);

  return {
    stats: {
      assignedOpen,
      overdue,
      dueToday,
      completedThisWeek,
      projects: projectIds.length,
      teams: teamIds.length,
    },
    statusBreakdown: toBreakdown(TASK_STATUSES, statusRows),
    priorityBreakdown: toBreakdown(TASK_PRIORITIES, priorityRows),
    upcomingTasks,
  };
}
