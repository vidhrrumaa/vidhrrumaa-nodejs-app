import { Request, Response, NextFunction } from 'express';
import config from '../config';
import * as csrf from '../utils/csrfToken';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// GET /api/v1/csrf-token - issues a token and sets the matching signed cookie.
export const issueToken = (req: Request, res: Response): void => {
  const { token, cookieValue } = csrf.generate();

  res.cookie(config.csrf.cookieName, cookieValue, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
  });

  res.json({ csrfToken: token });
};

// Guards state-changing routes: the "x-csrf-token" header must match the
// signed cookie set by issueToken above.
export const requireCsrf = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const headerToken = req.headers[config.csrf.headerName] as string | undefined;
  const cookieValue = req.cookies ? req.cookies[config.csrf.cookieName] : undefined;

  if (!csrf.verify(headerToken, cookieValue)) {
    throw ApiError.forbidden('Invalid or missing CSRF token');
  }
  next();
});

export default { issueToken, requireCsrf };
