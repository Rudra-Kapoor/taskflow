import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { Team } from '../src/models/index.js';
import { api, authHeader, expectError, expectSuccess, registerUser } from './helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/health', () => {
  it('reports that the API and its database are up', async () => {
    const health = expectSuccess(await api.get('/api/health'));

    expect(health).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      timestamp: expect.any(String),
    });
    expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
  });

  it('answers 503 while the database is unavailable', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expectError(await api.get('/api/health'), 503, 'Database unavailable');
    expect(log).toHaveBeenCalled();
  });
});

describe('error responses', () => {
  it('answers unknown API routes with a JSON 404', async () => {
    const res = await api.post('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      success: false,
      message: 'Route not found: POST /api/does-not-exist',
    });
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await api
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.co",');

    expectError(res, 400, 'Malformed JSON in request body');
  });

  it('rejects bodies larger than 100 kB with 413', async () => {
    const res = await api
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x'.repeat(200 * 1024) });

    expectError(res, 413, 'Request body is too large');
  });

  it('keeps the status of other client errors raised while reading the body', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await api
      .post('/api/auth/login')
      .set('Content-Type', 'application/json; charset=latin1')
      .send(JSON.stringify({ email: 'a@b.co', password: 'Secret123' }));

    expectError(res, 415, 'unsupported charset "LATIN1"');
    expect(res.body).not.toHaveProperty('stack');
    expect(log).not.toHaveBeenCalled(); // a client error, not a server failure
  });

  it('rejects a malformed id in the URL with 400 and the offending parameter', async () => {
    const user = await registerUser();

    const res = await api.get('/api/teams/not-an-id').set(authHeader(user));

    expectError(res, 400, 'Validation failed');
    expect(res.body.errors).toEqual([
      { field: 'teamId', location: 'params', message: 'Invalid team id' },
    ]);
  });

  it('requires a token on every protected route', async () => {
    const paths = [
      '/api/teams',
      '/api/projects',
      '/api/tasks',
      '/api/notifications',
      '/api/activity',
      '/api/dashboard',
      '/api/users/search?q=ab',
    ];

    for (const path of paths) expectError(await api.get(path), 401, 'Authentication required');
  });

  it('turns unexpected failures into a logged 500', async () => {
    const user = await registerUser();
    vi.spyOn(Team, 'find').mockImplementation(() => {
      throw new Error('Connection reset by peer');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await api.get('/api/teams').set(authHeader(user));

    expectError(res, 500, 'Connection reset by peer');
    // Outside production the stack trace is included to ease debugging.
    expect(res.body.stack).toEqual(expect.any(String));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('ERROR'),
      'GET /api/teams',
      expect.any(Error),
    );
  });
});

describe('HTTP hardening', () => {
  it('allows the configured client origin and nobody else', async () => {
    const [clientOrigin] = env.clientOrigins;

    const allowed = await api.get('/api/health').set('Origin', clientOrigin);
    const foreign = await api.get('/api/health').set('Origin', 'https://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe(clientOrigin);
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('only trusts X-Forwarded-For from the number of proxies set in TRUST_PROXY', () => {
    // How TRUST_PROXY itself is parsed (default 0 = no proxy) is covered in unit/env.test.js.
    expect(createApp().get('trust proxy')).toBe(env.trustProxy);
  });

  it('sends the usual security headers', async () => {
    const res = await api.get('/api/health');

    expect(res.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
    });
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });
});
