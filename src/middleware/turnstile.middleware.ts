import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

// Verifies the Cloudflare Turnstile token the frontend widget produced.
// Unlike Origin/Referer checks, this can't be faked by copying a header -
// the token only exists if a real challenge was solved, so a script/curl/
// Postman call with no token (or a made-up one) gets rejected here.
export const requireTurnstile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.body?.['cf-turnstile-response'];

  if (!token || typeof token !== 'string') {
    throw ApiError.badRequest('Missing CAPTCHA verification');
  }

  const params = new URLSearchParams({ secret: config.turnstile.secretKey, response: token });
  if (req.ip) params.append('remoteip', req.ip);

  const verifyRes = await fetch(VERIFY_URL, { method: 'POST', body: params });
  const result = (await verifyRes.json()) as TurnstileVerifyResponse;

  if (!result.success) {
    throw ApiError.forbidden('CAPTCHA verification failed');
  }

  next();
});

export default requireTurnstile;
