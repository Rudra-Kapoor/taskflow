import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isTokenCurrent, verifyToken } from '../utils/jwt.js';

/**
 * Requires a valid `Authorization: Bearer <jwt>` header and attaches the
 * authenticated user document to `req.user`. Tokens revoked by a password change are refused.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Authentication required. Please log in.');
  }

  const payload = verifyToken(token);
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user) throw ApiError.unauthorized('Your account no longer exists. Please sign up again.');
  if (!isTokenCurrent(payload, user)) throw ApiError.sessionExpired();

  req.user = user;
  next();
});
