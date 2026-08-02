import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import morgan from 'morgan';

import config from './config';
import logger from './config/logger';
import requestId from './middleware/requestId.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { notFound, errorHandler } from './middleware/error.middleware';
import routes from './routes';

const app = express();

// Trust the reverse proxy (GoDaddy/Passenger/Nginx) so req.ip, secure
// cookies and rate limiting see the real client IP and protocol.
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

app.use(helmet());

// Bump this string whenever you need to confirm a fresh publish actually
// picked up new code - if this value isn't in the boot logs after a deploy,
// the running process is still on the old build.
const BUILD_MARKER = '2026-08-02-cors-allow-all-test';
logger.info('Build marker', { BUILD_MARKER, bootTime: new Date().toISOString() });

// Log what CORS_ORIGINS actually parsed to at boot, since production reads
// this straight from host-injected env vars (see config/index.ts) - if the
// platform UI value differs from what you expect, it'll show up here.
logger.info('CORS allowed origins', { origins: config.cors.origins });

// TEMP DEBUG: reflect every origin (still can't use a literal '*' since
// credentials: true is set - the CORS spec forbids Allow-Origin: * with
// credentialed requests). matchesKnownOrigin is bypassed here on purpose to
// test whether the platform edge is stripping Access-Control-Allow-* headers
// regardless of value. requireKnownOrigin still gates the actual routes, so
// this alone does not open up the API to arbitrary origins.
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    logger.info('CORS check', { origin: origin ?? '(none)', allowed: true });
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', config.csrf.headerName, 'x-request-id'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(hpp());
app.use(compression());

app.use(requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms - origin=:req[origin]', { stream: logger.stream }));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    message: 'Vidhrrumaa API is running',
    timestamp: new Date().toISOString(),
  });
});

// API responses are per-request/per-session (CSRF tokens, cookies) and must
// never be cached by the platform CDN or an intermediate proxy - a cached
// copy can be replayed to a different origin/user without the CORS headers
// or CSRF cookie that were valid for the original request.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', apiLimiter);
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
