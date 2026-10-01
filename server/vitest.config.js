import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Starts one in-memory MongoDB for the run (skipped when MONGO_TEST_URI is set).
    globalSetup: ['./tests/globalSetup.js'],
    // Gives every test file its own throwaway database.
    setupFiles: ['./tests/setup.js'],
    // Always run the server in test mode (no request logging, rate limits or background jobs),
    // even if the shell or server/.env says otherwise.
    env: { NODE_ENV: 'test' },
    // One child process per file keeps module state (Mongoose connection, Socket.IO emitter,
    // presence map) isolated; running the files one at a time trades speed for stability.
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 30_000,
  },
});
