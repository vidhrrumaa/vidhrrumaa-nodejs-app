import { Request, Response, NextFunction } from 'express';
import config from '../config';
import logger from '../config/logger';
import { ApiError } from '../utils/ApiError';

// Must be registered after all real routes.
export function notFound(req: Request, res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Every error in the app ends up here, so responses stay consistent and
// internal details never leak to clients in production.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else {
    const maybeStatusCode = (err as { statusCode?: unknown } | null)?.statusCode;
    const statusCode = typeof maybeStatusCode === 'number' && Number.isInteger(maybeStatusCode)
      ? maybeStatusCode
      : 500;
    const message = err instanceof Error ? err.message : 'Internal server error';
    error = new ApiError(statusCode, message);
    error.isOperational = false;
    if (err instanceof Error && err.stack) error.stack = err.stack;
  }

  const payload: {
    success: false;
    error: { code: string; message: string; details?: unknown };
    requestId: string;
  } = {
    success: false,
    error: {
      code: error.code || 'ERROR',
      message: error.statusCode >= 500 && config.isProd
        ? 'Something went wrong. Please try again later.'
        : error.message,
    },
    requestId: req.id,
  };

  if (error.details) payload.error.details = error.details;

  const logMeta = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    origin: req.headers.origin ?? '(none)',
  };

  if (error.statusCode >= 500 || !error.isOperational) {
    logger.error(error.message, { ...logMeta, stack: error.stack });
  } else {
    logger.warn(error.message, logMeta);
  }

  res.status(error.statusCode).json(payload);
}

export default { notFound, errorHandler };
