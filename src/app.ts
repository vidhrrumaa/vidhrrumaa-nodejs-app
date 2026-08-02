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
import { matchesKnownOrigin } from './middleware/originCheck.middleware';
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
const BUILD_MARKER = '2026-08-02-cors-debug-1';
logger.info('Build marker', { BUILD_MARKER });

// Log what CORS_ORIGINS actually parsed to at boot, since production reads
// this straight from host-injected env vars (see config/index.ts) - if the
// platform UI value differs from what you expect, it'll show up here.
logger.info('CORS allowed origins', { origins: config.cors.origins });

// Only allow our own React site(s) to call the API, with cookies enabled.
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    const allowed = !origin || matchesKnownOrigin(origin);
    logger.info('CORS check', { origin: origin ?? '(none)', allowed });
    // Passing `false` (not an Error) just omits the Access-Control-Allow-*
    // headers, so browsers block reading the response - it still lets the
    // request reach route-level checks like requireKnownOrigin, which give
    // non-browser callers (curl/Postman) a clean 403 instead of a 500.
    callback(null, allowed);
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

app.use('/api', apiLimiter);
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
