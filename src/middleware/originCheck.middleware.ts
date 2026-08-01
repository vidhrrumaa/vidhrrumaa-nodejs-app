import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { ApiError } from '../utils/ApiError';

function parseOrigin(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAllowedOrigin(value: string, allowed: string): boolean {
  const candidate = parseOrigin(value);
  const allowedOrigin = parseOrigin(allowed);

  if (!candidate || !allowedOrigin) {
    return false;
  }

  const candidateHost = candidate.hostname.toLowerCase();
  const allowedHost = allowedOrigin.hostname.toLowerCase();
  const sameProtocol = candidate.protocol === allowedOrigin.protocol;

  if (!sameProtocol) {
    return false;
  }

  return candidateHost === allowedHost || candidateHost.endsWith(`.${allowedHost}`);
}

// Cheap first filter for the email endpoints: rejects requests whose Origin
// (or Referer, as a fallback for browsers that omit Origin) isn't one of our
// known frontend domains. This only screens out generic bots/scripts that
// don't bother setting these headers per target - it is NOT a security
// boundary, since any standalone HTTP client (Postman, curl, a script) can
// set Origin/Referer to any value it wants. Real abuse protection is
// rate limiting + CSRF + (soon) CAPTCHA, not this.
export function matchesKnownOrigin(value: string): boolean {
  return config.cors.origins.some((allowed) => isAllowedOrigin(value, allowed));
}

export function requireKnownOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if ((origin && matchesKnownOrigin(origin)) || (referer && matchesKnownOrigin(referer))) {
    return next();
  }

  next(ApiError.forbidden('Request origin not allowed'));
}

export default requireKnownOrigin;
