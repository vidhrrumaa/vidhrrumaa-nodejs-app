import { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps an async route handler so a thrown error or rejected promise is
// forwarded to Express's error middleware instead of crashing the process.
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
