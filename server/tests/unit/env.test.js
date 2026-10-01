import { afterEach, describe, expect, it, vi } from 'vitest';

/** Re-evaluates src/config/env.js against the given variables (`undefined` = not set). */
async function loadEnv(variables) {
  vi.resetModules();
  for (const [name, value] of Object.entries(variables)) vi.stubEnv(name, value);
  const { env } = await import('../../src/config/env.js');
  return env;
}

/** Loads the configuration expecting it to be refused; returns what was reported. */
async function rejectedEnv(variables) {
  const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});

  await expect(loadEnv(variables)).rejects.toThrow('process.exit(1)');
  expect(exit).toHaveBeenCalledWith(1);
  return log.mock.calls.flat().join('\n');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('TRUST_PROXY', () => {
  it('trusts no proxy unless configured', async () => {
    expect((await loadEnv({ TRUST_PROXY: undefined })).trustProxy).toBe(0);
    expect((await loadEnv({ TRUST_PROXY: '' })).trustProxy).toBe(0);
  });

  it('is the number of proxy hops in front of the server', async () => {
    expect((await loadEnv({ TRUST_PROXY: '1' })).trustProxy).toBe(1);
    expect((await loadEnv({ TRUST_PROXY: '2' })).trustProxy).toBe(2);
  });

  it.each(['true', '-1', '1.5'])('refuses %s', async (value) => {
    expect(await rejectedEnv({ TRUST_PROXY: value })).toContain('TRUST_PROXY');
  });
});

describe('JWT_SECRET', () => {
  const production = { NODE_ENV: 'production', MONGO_URI: 'mongodb://db.example/taskflow' };

  it('is required in production, where a blank value counts as missing', async () => {
    const report = await rejectedEnv({ ...production, JWT_SECRET: '' });

    expect(report).toContain('JWT_SECRET: is required in production');
  });

  it('must be at least 16 characters long', async () => {
    const report = await rejectedEnv({ ...production, JWT_SECRET: 'too-short' });

    expect(report).toContain('JWT_SECRET must be at least 16 characters');
  });
});
