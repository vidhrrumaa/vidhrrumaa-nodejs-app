// Operational error with an HTTP status code attached. Throw these from
// controllers/services; the global error handler turns them into clean JSON.
// Anything that isn't an ApiError is treated as an unexpected bug (500).

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorOptions {
  details?: ApiErrorDetail[];
  code?: string;
}

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: ApiErrorDetail[];
  code?: string;

  constructor(statusCode: number, message: string, { details, code }: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: ApiErrorDetail[]): ApiError {
    return new ApiError(400, message, { details, code: 'BAD_REQUEST' });
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message, { code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message, { code: 'FORBIDDEN' });
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, { code: 'NOT_FOUND' });
  }

  static tooMany(message = 'Too many requests'): ApiError {
    return new ApiError(429, message, { code: 'RATE_LIMITED' });
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, { code: 'INTERNAL_ERROR' });
  }
}

export default ApiError;
