import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

const CONNECTED = 1;

/** Liveness + readiness probe: answers 503 while the database connection is down. */
export const healthCheck = (_req, res, next) => {
  if (mongoose.connection.readyState !== CONNECTED) {
    return next(new ApiError(503, 'Database unavailable'));
  }
  return sendSuccess(res, {
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};
