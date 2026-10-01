import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const formatZodIssues = (error) =>
  error.issues.map((issue) => ({
    // Drop the "body"/"query"/"params" prefix so clients can map errors to form fields.
    field: issue.path.slice(1).join('.') || issue.path.join('.'),
    location: issue.path[0],
    message: issue.message,
  }));

/** Maps known library errors to consistent HTTP responses. */
const normaliseError = (err) => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError(400, 'Validation failed', formatZodIssues(err));
  }
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid value for "${err.path}"`);
  }
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(400, 'Validation failed', errors);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {}).join(', ') || 'field';
    return new ApiError(409, `A record with this ${field} already exists`);
  }
  if (err.name === 'VersionError') {
    return new ApiError(409, 'This item was changed by someone else at the same time. Please retry.');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiError.sessionExpired();
  }
  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid authentication token');
  }
  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, 'Malformed JSON in request body');
  }
  if (err.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large');
  }
  // Any other client error raised by Express or body-parser (http-errors), e.g. 415 for an
  // unsupported charset, keeps its status instead of becoming a 500.
  const status = err.status ?? err.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return new ApiError(status, err.expose ? err.message : 'Bad request');
  }
  return null;
};

export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Express identifies error handlers by their arity, so `_next` must stay in the signature.
export const errorHandler = (err, req, res, _next) => {
  const known = normaliseError(err);
  const status = known?.statusCode ?? 500;

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, err);
  }

  const body = {
    success: false,
    message: known?.message ?? (env.isProduction ? 'Something went wrong' : err.message),
  };
  if (known?.errors) body.errors = known.errors;
  if (!env.isProduction && status >= 500) body.stack = err.stack;

  res.status(status).json(body);
};
