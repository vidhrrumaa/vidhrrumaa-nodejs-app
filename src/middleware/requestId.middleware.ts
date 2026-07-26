import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Gives every request a unique id (or reuses one from an upstream proxy) so
// a single request can be traced through logs and the response header.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.id = (typeof incoming === 'string' && incoming.trim()) || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

export default requestId;
