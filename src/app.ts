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

// Only allow our own React site(s) to call the API, with cookies enabled.
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Passing `false` (not an Error) just omits the Access-Control-Allow-*
    // headers, so browsers block reading the response - it still lets the
    // request reach route-level checks like requireKnownOrigin, which give
    // non-browser callers (curl/Postman) a clean 403 instead of a 500.
    callback(null, !origin || config.cors.origins.includes(origin));
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
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: logger.stream }));

app.use('/api', apiLimiter);
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
