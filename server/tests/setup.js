import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, inject, vi } from 'vitest';
// Registers every model, so all indexes can be built before the first test runs.
import '../src/models/index.js';
import { stopApiServer } from './helpers.js';

/**
 * Runs before every test file (in that file's own process).
 *
 * Each file connects to a fresh, uniquely named database on the server provided by
 * globalSetup.js and drops it when the file is done, so files never see each other's data and
 * nothing is left behind. Tests that need a clean slate between tests call `resetDatabase()`
 * from helpers.js in a `beforeEach`.
 */

const TEST_DB_PREFIX = 'taskflow_test_';

/**
 * bcrypt at the production cost (10 rounds) takes a few hundred milliseconds per hash, which
 * would dominate the run time. The hashes stay real bcrypt hashes (`compare` reads the cost from
 * the hash), only the cost factor is lowered. (vi.mock is hoisted above the imports, so the
 * factory must not use module-level constants.)
 */
vi.mock('bcryptjs', async (importOriginal) => {
  const TEST_SALT_ROUNDS = 4;
  const actual = await importOriginal();
  const bcrypt = actual.default ?? actual;
  const fastBcrypt = {
    ...bcrypt,
    hash: (password) => bcrypt.hash(password, TEST_SALT_ROUNDS),
    hashSync: (password) => bcrypt.hashSync(password, TEST_SALT_ROUNDS),
  };
  return { ...actual, ...fastBcrypt, default: fastBcrypt };
});

const dbName = `${TEST_DB_PREFIX}${randomBytes(6).toString('hex')}`;

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName, serverSelectionTimeoutMS: 10_000 });
  // Unique indexes (user email, project key per team, task number per project) back several
  // conflict rules, so make sure they exist before any request is made.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
});

afterAll(async () => {
  await stopApiServer();

  const { connection } = mongoose;
  // Never drop anything but the database this file created.
  if (connection.readyState === mongoose.STATES.connected && connection.name === dbName) {
    await connection.dropDatabase();
  }
  await mongoose.disconnect();
});
