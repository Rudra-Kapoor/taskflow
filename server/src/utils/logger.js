const silent = process.env.NODE_ENV === 'test';

const timestamp = () => new Date().toISOString();

/**
 * Minimal structured logger. Kept dependency-free on purpose; swap for pino/winston
 * if log shipping is required.
 */
export const logger = {
  info: (...args) => {
    if (!silent) console.log(`[${timestamp()}] INFO `, ...args);
  },
  warn: (...args) => {
    if (!silent) console.warn(`[${timestamp()}] WARN `, ...args);
  },
  error: (...args) => {
    console.error(`[${timestamp()}] ERROR`, ...args);
  },
};
