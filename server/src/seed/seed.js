import bcrypt from 'bcryptjs';
import { Activity, Comment, Notification, Project, Task, Team, User } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { buildDemoData } from './build.js';
import { DEMO_TZ_OFFSET, USERS } from './data.js';

export const DEMO_PASSWORD = 'Demo@1234';

export const DEMO_ACCOUNTS = USERS.map(({ name, email, title }) => ({ name, email, title }));

const SALT_ROUNDS = 10;

/** Insertion order follows references: users, then teams, projects, tasks... */
const COLLECTIONS = [
  ['users', User],
  ['teams', Team],
  ['projects', Project],
  ['tasks', Task],
  ['comments', Comment],
  ['activities', Activity],
  ['notifications', Notification],
];

/**
 * Runs a plain object through its Mongoose schema (casting, defaults, validation) and returns
 * the raw document. Documents are inserted through the driver because Model.create() would
 * replace the historical createdAt/updatedAt values with the current time.
 */
function toRawDocument(Model, data) {
  const document = new Model(data);
  const error = document.validateSync();
  if (error) throw new Error(`Invalid ${Model.modelName} seed document: ${error.message}`);
  return { ...document.toObject({ minimize: false }), __v: 0 };
}

/**
 * Loads the TaskFlow demo workspace from data.js: users in two teams, projects (one archived)
 * with tasks in every column, comments, activity history and notifications. All dates are
 * relative to `now`, so the demo always has overdue, due-today and upcoming work.
 * Assumes Mongoose is connected.
 *
 * @param {object} [options]
 * @param {boolean} [options.reset=false] Delete every document of the app's collections first.
 *   Without it, seeding fails if the demo accounts already exist.
 * @param {Date} [options.now] Reference time for the relative dates.
 * @param {number} [options.tzOffset] Timezone of the demo team for due dates, in
 *   Date#getTimezoneOffset() minutes (defaults to IST, -330).
 * @returns {Promise<Record<string, number>>} Number of documents inserted per collection.
 */
export async function seedDatabase({
  reset = false,
  now = new Date(),
  tzOffset = DEMO_TZ_OFFSET,
} = {}) {
  const models = COLLECTIONS.map(([, Model]) => Model);
  // A reset also drops indexes the schemas no longer define (e.g. ones replaced by a schema
  // change); otherwise only missing indexes are built.
  await Promise.all(models.map((Model) => (reset ? Model.syncIndexes() : Model.init())));

  if (reset) {
    await Promise.all(models.map((Model) => Model.deleteMany({})));
  } else if (await User.exists({ email: { $in: DEMO_ACCOUNTS.map(({ email }) => email) } })) {
    throw new Error('Demo accounts already exist - seed with { reset: true } to recreate them');
  }

  const data = buildDemoData({ now, tzOffset });
  const hashes = await Promise.all(data.users.map(() => bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS)));
  data.users.forEach((user, index) => {
    user.password = hashes[index];
  });

  // Validate every document before writing anything.
  const batches = COLLECTIONS.map(([name, Model]) => ({
    name,
    Model,
    documents: data[name].map((item) => toRawDocument(Model, item)),
  }));

  const summary = {};
  for (const { name, Model, documents } of batches) {
    if (documents.length) await Model.collection.insertMany(documents);
    summary[name] = documents.length;
  }

  const counts = Object.entries(summary).map(([name, count]) => `${count} ${name}`);
  logger.info(`Demo data seeded: ${counts.join(', ')}`);
  return summary;
}
