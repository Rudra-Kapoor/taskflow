import { api, rotateToken, unwrap } from './client';

/** @returns {Promise<{ user: object, token: string }>} */
export async function login({ email, password }) {
  return unwrap(await api.post('/auth/login', { email, password }));
}

/** @returns {Promise<{ user: object, token: string }>} */
export async function register({ name, email, password }) {
  return unwrap(await api.post('/auth/register', { name, email, password }));
}

/** The signed-in user. */
export async function getMe({ signal } = {}) {
  return unwrap(await api.get('/auth/me', { signal })).user;
}

/** Updates `{ name?, title?, avatarColor? }` and resolves with the updated user. */
export async function updateProfile(data) {
  return unwrap(await api.patch('/auth/me', data)).user;
}

/**
 * Changes the password, which revokes every token issued so far, and stores the new token the
 * server returns for this session. Resolves with that token.
 */
export function changePassword({ currentPassword, newPassword }) {
  return rotateToken(async () => {
    const body = { currentPassword, newPassword };
    return unwrap(await api.patch('/auth/me/password', body)).token;
  });
}
