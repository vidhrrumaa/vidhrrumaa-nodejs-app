import rateLimit, { Options } from 'express-rate-limit';
import config from '../config';

interface RateLimiterConfig {
  windowMs: number;
  max: number;
  message?: string;
}

// Returns JSON (not HTML) on limit so the React client can parse it.
function createRateLimiter({ windowMs, max, message }: RateLimiterConfig): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: message || 'Too many requests, please try again later.',
      },
    },
  } as Partial<Options>);
}

// Broad limiter for the whole API.
const apiLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});

// Stricter limiter for the email-sending endpoints (abuse-prone).
const emailLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.emailMax,
  message: 'Too many submissions. Please wait a few minutes and try again.',
});

export { createRateLimiter, apiLimiter, emailLimiter };
export default { createRateLimiter, apiLimiter, emailLimiter };
