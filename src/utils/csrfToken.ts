import crypto from 'crypto';
import config from '../config';

// Signed double-submit cookie CSRF check, built on Node's crypto so it adds
// no extra dependency.
//
//   1. Client calls GET /api/v1/csrf-token -> gets a token in the body and a
//      signed, httpOnly cookie ("<token>.<hmac>").
//   2. Client sends that token back in the "x-csrf-token" header on POSTs.
//   3. We verify the header token matches the signed cookie.
//
// A third-party site can't read the response body (CORS) or forge the
// httpOnly cookie, so it can't produce a matching pair.

function sign(value: string): string {
  const hmac = crypto.createHmac('sha256', config.csrf.secret).update(value).digest('hex');
  return `${value}.${hmac}`;
}

export function generate(): { token: string; cookieValue: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, cookieValue: sign(token) };
}

export function verify(headerToken: string | undefined, cookieValue: string | undefined): boolean {
  if (!headerToken || !cookieValue) return false;

  const dot = cookieValue.lastIndexOf('.');
  if (dot === -1) return false;

  const rawValue = cookieValue.slice(0, dot);
  const expected = sign(rawValue);

  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const h = Buffer.from(headerToken);
  const v = Buffer.from(rawValue);
  if (h.length !== v.length || !crypto.timingSafeEqual(h, v)) return false;

  return true;
}

export default { generate, verify };
