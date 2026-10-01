import http from 'node:http';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { startDueReminderJob } from './jobs/dueReminders.js';
import { runMigrations } from './migrations.js';
import { User } from './models/index.js';
import { initSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10 * 1000;

/**
 * Seeds demo data into an empty database when enabled (always for the embedded dev database).
 * Seeding is a convenience, so a failure is logged and the server still starts.
 */
async function seedIfEmpty() {
  if (!env.seedOnEmptyDb && env.mongoUri) return;
  if (await User.exists({})) return;

  try {
    logger.info('Empty database detected - seeding demo data');
    const { seedDatabase } = await import('./seed/seed.js');
    await seedDatabase();
  } catch (error) {
    logger.error('Demo data seeding failed - continuing with an empty database', error);
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.port, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function registerShutdownHandlers({ io, stopJobs }) {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received - shutting down gracefully`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out - forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      stopJobs();
      // Disconnects every socket and closes the underlying HTTP server.
      await new Promise((resolve) => io.close(() => resolve()));
      await disconnectDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function main() {
  await connectDatabase();
  await seedIfEmpty();
  await runMigrations();

  const server = http.createServer(createApp());
  const io = initSocket(server);
  const stopJobs = startDueReminderJob();
  registerShutdownHandlers({ io, stopJobs });

  await listen(server);
  logger.info(`TaskFlow API listening on http://localhost:${env.port} (${env.nodeEnv})`);
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  // State is unknown after an uncaught exception: log it, exit and let the supervisor restart.
  logger.error('Uncaught exception', error);
  process.exit(1);
});

main().catch(async (error) => {
  logger.error('Failed to start the server', error);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
