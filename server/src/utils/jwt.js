import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Tokens are always HMAC-SHA256: pinning the algorithm means no other one is ever accepted. */
const ALGORITHM = 'HS256';

/**
 * `ver` is the account's `tokenVersion` when the token is issued. Changing the password
 * increments the version, which revokes every token issued before (see `isTokenCurrent`).
 */
export const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), ver: user.tokenVersion ?? 0 }, env.jwtSecret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwtExpiresIn,
  });

/** Throws JsonWebTokenError / TokenExpiredError on invalid tokens. */
export const verifyToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });

/**
 * False once the account's `tokenVersion` has moved past the version the token was issued with.
 * Tokens issued before versioning existed carry no `ver` and count as version 0.
 */
export const isTokenCurrent = (payload, user) => (payload.ver ?? 0) === (user.tokenVersion ?? 0);
