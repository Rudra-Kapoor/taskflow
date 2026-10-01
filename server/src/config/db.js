import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let embeddedServer = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Development convenience: when no MONGO_URI is configured we boot an embedded
 * MongoDB whose data is persisted to `server/.data/mongo`, so the project runs
 * with zero external setup. Never used in production.
 */
async function startEmbeddedMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.join(serverRoot, '.data', 'mongo');
  await mkdir(dbPath, { recursive: true });

  // A previous dev process (e.g. a `--watch` restart) may still be releasing the lock.
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      embeddedServer = await MongoMemoryServer.create({
        instance: { dbPath, storageEngine: 'wiredTiger' },
      });
      return embeddedServer.getUri('taskflow');
    } catch (error) {
      if (attempt === 5) throw error;
      logger.warn(`Embedded MongoDB not ready (attempt ${attempt}): ${error.message}`);
      await wait(1500);
    }
  }
  return null;
}

export async function connectDatabase() {
  let uri = env.mongoUri;

  if (!uri) {
    logger.warn('MONGO_URI not set - starting embedded MongoDB for local development');
    uri = await startEmbeddedMongo();
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (embeddedServer) {
    await embeddedServer.stop({ doCleanup: false });
    embeddedServer = null;
  }
}
