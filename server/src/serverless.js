import http from 'node:http';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { runMigrations } from './migrations.js';
import { User } from './models/index.js';
import { initSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

/**
 * Serverless entry point (Vercel). Each warm function instance keeps one Express app and one
 * Socket.IO server in memory; requests are handed to them through an unbound HTTP server, so
 * Socket.IO intercepts its own path and everything else reaches Express. Serverless functions
 * can't hold WebSocket connections, so clients use Socket.IO's HTTP long-polling transport.
 */
const server = http.createServer(createApp());
initSocket(server);

let ready = null;

async function prepare() {
  await connectDatabase();
  await runMigrations();
  if (env.seedOnEmptyDb && !(await User.exists({}))) {
    logger.info('Empty database detected - seeding demo data');
    const { seedDatabase } = await import('./seed/seed.js');
    await seedDatabase();
  }
}

/** Connects (and seeds) once per instance; a failed start is retried on the next request. */
function ensureReady() {
  ready ??= prepare().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export default async function handler(req, res) {
  try {
    await ensureReady();
  } catch (error) {
    logger.error('Serverless start-up failed', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Service temporarily unavailable' }));
    return;
  }
  server.emit('request', req, res);
}
