import { Activity, Project } from './models/index.js';
import { logger } from './utils/logger.js';

/**
 * Idempotent data upgrades for databases created by older versions, run at start-up before the
 * server accepts requests. Each one only picks the documents that still need it.
 */

/**
 * Projects created before `lastActivityAt` existed get the time of their newest activity entry
 * (their `updatedAt` if they have none). Returns the number of projects upgraded.
 */
export async function backfillProjectLastActivity() {
  const projects = await Project.find({ lastActivityAt: { $exists: false } })
    .select('updatedAt')
    .lean();
  if (!projects.length) return 0;

  const newest = await Activity.aggregate([
    { $match: { project: { $in: projects.map((project) => project._id) } } },
    { $group: { _id: '$project', at: { $max: '$createdAt' } } },
  ]);
  const newestByProject = new Map(newest.map(({ _id, at }) => [_id.toString(), at]));

  await Project.bulkWrite(
    projects.map(({ _id, updatedAt }) => ({
      updateOne: {
        filter: { _id, lastActivityAt: { $exists: false } },
        update: { $set: { lastActivityAt: newestByProject.get(_id.toString()) ?? updatedAt } },
        timestamps: false,
      },
    })),
  );
  return projects.length;
}

/** Upgrades are a convenience for old data: a failure is logged and the server still starts. */
export async function runMigrations() {
  try {
    const projects = await backfillProjectLastActivity();
    if (projects) logger.info(`Set lastActivityAt on ${projects} existing project(s)`);
  } catch (error) {
    logger.error('Data upgrade failed - continuing with the data as it is', error);
  }
}
