import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { User } from '../src/models/index.js';
import {
  api,
  authHeader,
  errorFields,
  expectError,
  expectSuccess,
  registerUser,
  resetDatabase,
} from './helpers.js';

const registration = (overrides = {}) => ({
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  password: 'Secret123',
  ...overrides,
});

const register = (body) => api.post('/api/auth/register').send(body);
const login = (email, password) => api.post('/api/auth/login').send({ email, password });
const getMe = (token) => api.get('/api/auth/me').set(authHeader(token));

beforeEach(resetDatabase);

describe('POST /api/auth/register', () => {
  it('creates an account and returns the public user with a working token', async () => {
    const res = await register(registration({ email: '  Aarav@Example.COM ' }));

    const { user, token } = expectSuccess(res, 201);
    expect(user).toEqual({
      _id: expect.any(String),
      name: 'Aarav Sharma',
      email: 'aarav@example.com',
      title: '',
      avatarColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(expectSuccess(await getMe(token)).user._id).toBe(user._id);
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    const { user } = expectSuccess(await register(registration()), 201);

    const stored = await User.findById(user._id).select('+password').lean();
    expect(stored.password).not.toContain('Secret123');
    expect(stored.password).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('ignores fields that cannot be set at sign-up', async () => {
    const res = await register(
      registration({ title: 'CEO', avatarColor: '#000000', role: 'admin' }),
    );

    const { user } = expectSuccess(res, 201);
    expect(user.title).toBe('');
    expect(user.avatarColor).not.toBe('#000000');
    expect(user).not.toHaveProperty('role');
  });

  it('reports every invalid field with its location', async () => {
    const res = await register({ name: 'A', email: 'not-an-email', password: 'short' });

    expectError(res, 400, 'Validation failed');
    expect(errorFields(res)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    expect(res.body.errors.every((error) => error.location === 'body')).toBe(true);
  });

  it.each([
    ['shorter than 8 characters', 'Abc123', 'at least 8 characters'],
    ['without a number', 'OnlyLetters', 'at least one number'],
    ['without a letter', '12345678', 'at least one letter'],
  ])('rejects a password %s', async (_case, password, message) => {
    const res = await register(registration({ password }));

    expectError(res, 400);
    expect(res.body.errors).toContainEqual(
      expect.objectContaining({ field: 'password', message: expect.stringContaining(message) }),
    );
  });

  it('rejects an email that is already registered, regardless of case', async () => {
    await registerUser({ email: 'taken@example.com' });

    const res = await register(registration({ email: 'TAKEN@example.com' }));

    expectError(res, 409, 'An account with this email already exists');
    expect(res.body.errors).toEqual([
      { field: 'email', location: 'body', message: 'An account with this email already exists' },
    ]);
  });

  it('lets only one of two simultaneous sign-ups with the same email succeed', async () => {
    const responses = await Promise.all([
      register(registration({ email: 'race@example.com' })),
      register(registration({ email: 'race@example.com' })),
    ]);

    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
    const conflict = responses.find((res) => res.status === 409);
    expect(errorFields(conflict)).toEqual(['email']);
    expect(await User.countDocuments({ email: 'race@example.com' })).toBe(1);
  });
});

describe('POST /api/auth/login', () => {
  let user;

  beforeEach(async () => {
    user = await registerUser({ email: 'priya@example.com' });
  });

  it('returns the user and a token for valid credentials (email is case-insensitive)', async () => {
    const res = await login('PRIYA@example.com', user.password);

    const { user: loggedIn, token } = expectSuccess(res);

    expect(loggedIn).toMatchObject({ _id: user._id, email: 'priya@example.com' });
    expect(loggedIn).not.toHaveProperty('password');
    expectSuccess(await getMe(token));
  });

  it('answers a wrong password and an unknown email with the same 401', async () => {
    const wrongPassword = await login('priya@example.com', 'Wrong1234');
    const unknownEmail = await login('nobody@example.com', 'Wrong1234');

    expectError(wrongPassword, 401, 'Invalid email or password');
    expectError(unknownEmail, 401, 'Invalid email or password');
  });

  it('requires an email and a password', async () => {
    const res = await api.post('/api/auth/login').send({});

    expectError(res, 400, 'Validation failed');
    expect(errorFields(res)).toEqual(expect.arrayContaining(['email', 'password']));
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user with timestamps', async () => {
    const user = await registerUser({ name: 'Priya Patel' });

    const { user: me } = expectSuccess(await getMe(user.token));

    expect(me).toMatchObject({ _id: user._id, name: 'Priya Patel', email: user.email });
    expect(me).toHaveProperty('createdAt');
    expect(me).toHaveProperty('updatedAt');
    expect(me).not.toHaveProperty('password');
  });

  it('rejects a request without a token', async () => {
    expectError(await api.get('/api/auth/me'), 401, 'Authentication required');
  });

  it('rejects an authorization header that is not a Bearer token', async () => {
    const user = await registerUser();

    const res = await api.get('/api/auth/me').set('Authorization', `Token ${user.token}`);

    expectError(res, 401, 'Authentication required');
  });

  it('rejects a malformed token and a token signed with another secret', async () => {
    const user = await registerUser();
    const forged = jwt.sign({ sub: user._id }, 'not-the-server-secret-0123456789');

    expectError(await getMe('garbage'), 401, 'Invalid authentication token');
    expectError(await getMe(forged), 401, 'Invalid authentication token');
  });

  it('rejects an expired token', async () => {
    const user = await registerUser();
    const expired = jwt.sign(
      { sub: user._id, exp: Math.floor(Date.now() / 1000) - 60 },
      env.jwtSecret,
    );

    expectError(await getMe(expired), 401, 'Your session has expired');
  });

  it('issues HS256 tokens and refuses other algorithms, even with the right secret', async () => {
    const user = await registerUser();
    const hs512 = jwt.sign({ sub: user._id, ver: 0 }, env.jwtSecret, { algorithm: 'HS512' });

    expect(jwt.decode(user.token, { complete: true })).toMatchObject({
      header: { alg: 'HS256' },
      payload: { sub: user._id, ver: 0 },
    });
    expectError(await getMe(hs512), 401, 'Invalid authentication token');
  });

  it('still accepts tokens issued before token versions existed (no `ver` claim)', async () => {
    const user = await registerUser();
    const legacy = jwt.sign({ sub: user._id }, env.jwtSecret, { expiresIn: '1h' });

    expect(expectSuccess(await getMe(legacy)).user._id).toBe(user._id);
  });

  it('rejects the token of an account that no longer exists', async () => {
    const user = await registerUser();
    await User.deleteOne({ _id: user._id });

    expectError(await getMe(user.token), 401, 'no longer exists');
  });
});

describe('PATCH /api/auth/me', () => {
  const updateMe = (user, body) => api.patch('/api/auth/me').set(authHeader(user)).send(body);

  it('updates the name, title and avatar colour', async () => {
    const user = await registerUser();

    const res = await updateMe(user, {
      name: '  Priya Patel ',
      title: 'Team Lead',
      avatarColor: '#FF00AA',
    });

    expect(expectSuccess(res).user).toMatchObject({
      name: 'Priya Patel',
      title: 'Team Lead',
      avatarColor: '#ff00aa',
      email: user.email,
    });
    expect(expectSuccess(await getMe(user.token)).user.title).toBe('Team Lead');
  });

  it('requires at least one editable field (the email cannot be changed here)', async () => {
    const user = await registerUser();

    for (const body of [{}, { email: 'new@example.com' }]) {
      const res = await updateMe(user, body);
      expectError(res, 400, 'Validation failed');
      expect(res.body.errors[0].message).toBe('Provide at least one field to update');
    }
    expect(expectSuccess(await getMe(user.token)).user.email).toBe(user.email);
  });

  it('validates the avatar colour and the title length', async () => {
    const user = await registerUser();

    const res = await updateMe(user, { avatarColor: 'red', title: 'x'.repeat(81) });

    expectError(res, 400);
    expect(errorFields(res)).toEqual(expect.arrayContaining(['avatarColor', 'title']));
  });
});

describe('PATCH /api/auth/me/password', () => {
  const changePassword = (user, body) =>
    api.patch('/api/auth/me/password').set(authHeader(user)).send(body);

  it('rejects a wrong current password on the currentPassword field', async () => {
    const user = await registerUser();

    const res = await changePassword(user, {
      currentPassword: 'Wrong1234',
      newPassword: 'NewSecret456',
    });

    expectError(res, 400, 'Current password is incorrect');
    expect(errorFields(res)).toEqual(['currentPassword']);
    // A failed attempt changes nothing: the session is still valid.
    expectSuccess(await getMe(user.token));
  });

  it('rejects a weak new password or one equal to the current password', async () => {
    const user = await registerUser();

    const weak = await changePassword(user, {
      currentPassword: user.password,
      newPassword: 'weak',
    });
    const same = await changePassword(user, {
      currentPassword: user.password,
      newPassword: user.password,
    });

    expectError(weak, 400);
    expect(errorFields(weak)).toContain('newPassword');
    expectError(same, 400);
    expect(same.body.errors).toContainEqual(
      expect.objectContaining({
        field: 'newPassword',
        message: expect.stringContaining('different'),
      }),
    );
  });

  it('changes the password so that only the new one can be used to log in', async () => {
    const user = await registerUser();

    const res = await changePassword(user, {
      currentPassword: user.password,
      newPassword: 'NewSecret456',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Password updated successfully',
      data: { token: expect.any(String) },
    });
    expectError(await login(user.email, user.password), 401);
    expectSuccess(await login(user.email, 'NewSecret456'));
  });

  it('revokes every existing session and returns a fresh token for this one', async () => {
    const user = await registerUser();
    const otherDevice = expectSuccess(await login(user.email, user.password)).token;

    const { token } = expectSuccess(
      await changePassword(user, { currentPassword: user.password, newPassword: 'NewSecret456' }),
    );

    expectError(await getMe(user.token), 401, 'Your session has expired. Please log in again.');
    expectError(await getMe(otherDevice), 401, 'Your session has expired');
    expect(expectSuccess(await getMe(token)).user._id).toBe(user._id);
    // Later logins are issued tokens of the new version.
    const { token: nextLogin } = expectSuccess(await login(user.email, 'NewSecret456'));
    expectSuccess(await getMe(nextLogin));
    expect(expectSuccess(await getMe(token)).user).not.toHaveProperty('tokenVersion');
  });
});
