import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const limitExceeded = (message) => (_req, res, _next, options) =>
  res.status(options.statusCode).json({ success: false, message });

// Limits are per IP and only enforced in production: locally every browser tab, test run and
// dev tool shares 127.0.0.1, so they would only get in the way of development.
const skipOutsideProduction = () => !env.isProduction;

/** Brute-force protection for login/register. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipOutsideProduction,
  handler: limitExceeded('Too many authentication attempts. Please try again in a few minutes.'),
});

/** Generous global limit to protect the API from abuse. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipOutsideProduction,
  handler: limitExceeded('Too many requests. Please slow down.'),
});
