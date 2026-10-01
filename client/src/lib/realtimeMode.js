/**
 * Real-time transport. Normally a Socket.IO connection pushes every change. On serverless hosting
 * (Vercel) there is no long-running server to hold socket sessions, so the build sets
 * `VITE_REALTIME_MODE=poll` and open views refresh themselves every few seconds instead.
 */
export const POLL_MODE = import.meta.env.VITE_REALTIME_MODE === 'poll';

export const POLL_INTERVAL_MS = 4000;
