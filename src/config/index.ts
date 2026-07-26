import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Joi from 'joi';

// .env.prod for NODE_ENV=production, .env.local for everything else
// (development, test). Falls back to a plain ".env" if the expected file
// isn't present, e.g. when a host injects env vars directly (GoDaddy cPanel).
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: fs.existsSync(envPath) ? envPath : path.resolve(process.cwd(), '.env') });

interface EnvVars {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CORS_ORIGINS: string;
  CSRF_SECRET: string;
  TRUST_PROXY: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  MAIL_FROM: string;
  MAIL_CONTACT_TO: string;
  MAIL_CAREERS_TO: string;
  MAX_UPLOAD_MB: number;
  RATE_LIMIT_WINDOW_MIN: number;
  RATE_LIMIT_MAX: number;
  EMAIL_RATE_LIMIT_MAX: number;
  TURNSTILE_SECRET_KEY: string;
}

// All env vars are declared and validated here, once. If something required
// is missing the app exits immediately instead of failing weirdly later.
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Comma-separated list of origins allowed to call the API, e.g.
  // "https://www.example.com,https://example.com"
  CORS_ORIGINS: Joi.string().required(),

  // Secret used to sign the CSRF cookie.
  CSRF_SECRET: Joi.string().min(32).required(),

  // Set to "1" behind a reverse proxy (GoDaddy/Passenger/Nginx) so req.ip
  // and secure cookies see the real client IP/protocol.
  TRUST_PROXY: Joi.string().default('1'),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false), // true for port 465
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),

  MAIL_FROM: Joi.string().required(),
  MAIL_CONTACT_TO: Joi.string().required(),
  MAIL_CAREERS_TO: Joi.string().required(),

  MAX_UPLOAD_MB: Joi.number().default(5),

  RATE_LIMIT_WINDOW_MIN: Joi.number().default(15),
  RATE_LIMIT_MAX: Joi.number().default(50),
  EMAIL_RATE_LIMIT_MAX: Joi.number().default(5),

  // Cloudflare Turnstile secret key, used server-side to verify the token
  // the frontend widget produces. The matching site key is public and lives
  // in the frontend app, not here.
  TURNSTILE_SECRET_KEY: Joi.string().required(),
})
  .unknown()
  .prefs({ abortEarly: false });

const { value: env, error } = envSchema.validate(process.env) as {
  value: EnvVars;
  error?: Joi.ValidationError;
};

if (error) {
  const details = error.details.map((d) => `  - ${d.message}`).join('\n');
  console.error(`\n[config] Invalid environment configuration:\n${details}\n`);
  process.exit(1);
}

export interface Config {
  env: string;
  isProd: boolean;
  isTest: boolean;
  port: number;
  trustProxy: string;
  cors: { origins: string[] };
  csrf: { secret: string; cookieName: string; headerName: string };
  smtp: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } };
  mail: { from: string; contactTo: string; careersTo: string };
  uploads: { maxBytes: number; maxMb: number };
  rateLimit: { windowMs: number; max: number; emailMax: number };
  turnstile: { secretKey: string };
}

const config: Config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  trustProxy: env.TRUST_PROXY,

  cors: {
    origins: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  },

  csrf: {
    secret: env.CSRF_SECRET,
    cookieName: 'csrf',
    headerName: 'x-csrf-token',
  },

  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  },

  mail: {
    from: env.MAIL_FROM,
    contactTo: env.MAIL_CONTACT_TO,
    careersTo: env.MAIL_CAREERS_TO,
  },

  uploads: {
    maxBytes: env.MAX_UPLOAD_MB * 1024 * 1024,
    maxMb: env.MAX_UPLOAD_MB,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    max: env.RATE_LIMIT_MAX,
    emailMax: env.EMAIL_RATE_LIMIT_MAX,
  },

  turnstile: {
    secretKey: env.TURNSTILE_SECRET_KEY,
  },
};

export default config;
