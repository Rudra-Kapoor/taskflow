/**
 * Operational error carrying an HTTP status code. Anything thrown that is NOT an
 * ApiError is treated as an unexpected (500) error by the global error handler.
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }

  static badRequest(message = 'Bad request', errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  /** The token expired or was revoked (e.g. by a password change). */
  static sessionExpired() {
    return new ApiError(401, 'Your session has expired. Please log in again.');
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists', errors) {
    return new ApiError(409, message, errors);
  }
}
