/**
 * `npm run seed` - WIPES the configured database and loads the TaskFlow demo workspace.
 * Uses MONGO_URI from the environment (or server/.env).
 */
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seedDatabase } from './seed.js';

async function run() {
  const connection = await connectDatabase();
  logger.warn(`Wiping all TaskFlow data in database "${connection.name}" and loading the demo...`);

  const summary = await seedDatabase({ reset: true });

  console.log('\nDocuments created (the previous data was deleted):');
  console.table(summary);
  console.log('\nDemo accounts:');
  console.table(DEMO_ACCOUNTS.map((account) => ({ ...account, password: DEMO_PASSWORD })));
  console.log(`\nSign in as ${DEMO_ACCOUNTS[0].email} / ${DEMO_PASSWORD} to explore the demo.`);
  console.log('Dates are relative to now: re-run the seed before a demo to keep them fresh.\n');
}

try {
  await run();
  await disconnectDatabase();
  process.exit(0);
} catch (error) {
  logger.error('Seeding failed:', error);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
}
