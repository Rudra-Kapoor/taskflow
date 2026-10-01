import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { disconnectUser, emitToUserAndTeams, refreshUserProfile } from '../socket/emitter.js';
import { SERVER_EVENTS } from '../socket/events.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/jwt.js';
import { getMemberTeamIds } from './access.service.js';
import { toUserPublic } from './serializers.js';

/**
 * Compared against when the email is unknown, so a failed login takes the same time whether
 * or not the account exists (prevents user enumeration through response timing).
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('taskflow-timing-equaliser', 10);
const INVALID_CREDENTIALS = 'Invalid email or password';

/** 409 that also names the field, so the sign-up form can show it under the email input. */
const emailTaken = () => {
  const message = 'An account with this email already exists';
  return ApiError.conflict(message, [{ field: 'email', location: 'body', message }]);
};

export async function registerUser({ name, email, password }) {
  if (await User.exists({ email })) throw emailTaken();

  try {
    const user = await User.create({ name, email, password });
    return { user, token: signToken(user) };
  } catch (error) {
    // Two sign-ups with the same email at the same time: the unique index decides.
    if (error.code === 11000) throw emailTaken();
    throw error;
  }
}

export async function loginUser({ email, password }) {
  // The token embeds the current `tokenVersion`, so it is loaded along with the password.
  const user = await User.findOne({ email }).select('+password +tokenVersion');
  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw ApiError.unauthorized(INVALID_CREDENTIALS);
  }
  if (!(await user.comparePassword(password))) throw ApiError.unauthorized(INVALID_CREDENTIALS);

  return { user, token: signToken(user) };
}

/**
 * Edits the name, title or avatar colour and shows the result live wherever the user appears:
 * `user:updated` (UserPublic) goes to their teammates and their own other tabs, and the boards
 * they are viewing re-broadcast presence. Saving unchanged values sends nothing.
 */
export async function updateProfile(user, changes) {
  for (const [field, value] of Object.entries(changes)) {
    if (value !== undefined) user.set(field, value);
  }
  if (!user.isModified()) return user;

  await user.save();
  const profile = toUserPublic(user);
  const teamIds = await getMemberTeamIds(user._id);
  emitToUserAndTeams(user._id, teamIds, SERVER_EVENTS.USER_UPDATED, profile);
  refreshUserProfile(profile);
  return user;
}

/**
 * Changes the password and ends every session: incrementing `tokenVersion` revokes all tokens
 * issued so far, and the user's open sockets are disconnected. Returns a fresh token for the
 * session that made the change.
 *
 * @returns {Promise<{ token: string }>}
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password +tokenVersion');
  if (!user) throw ApiError.unauthorized('Your account no longer exists. Please sign up again.');

  if (!(await user.comparePassword(currentPassword))) {
    const message = 'Current password is incorrect';
    throw ApiError.badRequest(message, [{ field: 'currentPassword', location: 'body', message }]);
  }

  user.password = newPassword; // hashed by the pre-save hook
  // Saved as an atomic `$inc`: even concurrent changes always revoke every earlier token.
  user.$inc('tokenVersion', 1);
  await user.save();

  disconnectUser(user._id);
  return { token: signToken(user) };
}
