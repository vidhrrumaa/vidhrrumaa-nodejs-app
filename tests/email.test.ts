// Set a minimal valid env before anything requires ./src/config.
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'https://example.com';
process.env.CSRF_SECRET = 'x'.repeat(48);
process.env.SMTP_HOST = 'smtp.test';
process.env.SMTP_USER = 'user';
process.env.SMTP_PASS = 'pass';
process.env.MAIL_FROM = 'Website <no-reply@example.com>';
process.env.MAIL_CONTACT_TO = 'info@example.com';
process.env.MAIL_CAREERS_TO = 'careers@example.com';
process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

// Mock the transport so no real emails are sent during tests.
jest.mock('../src/services/mailer.service', () => ({
  verifyConnection: jest.fn().mockResolvedValue(true),
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  close: jest.fn(),
  getTransporter: jest.fn(),
}));

// Stub the Cloudflare Turnstile verification call so tests don't hit the
// real network - any non-empty token is treated as valid.
global.fetch = jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ success: true }),
}) as unknown as typeof fetch;

import request from 'supertest';
import app from '../src/app';

const ORIGIN = 'https://example.com';

// Fetches a CSRF token; the agent's cookie jar keeps the cookie for later requests.
async function getToken(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get('/api/v1/csrf-token').set('Origin', ORIGIN);
  return res.body.csrfToken;
}

describe('Health', () => {
  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('CSRF protection', () => {
  it('rejects POST /email/contact without a CSRF token', async () => {
    const res = await request(app)
      .post('/api/v1/email/contact')
      .set('Origin', ORIGIN)
      .send({ fullName: 'Jane Doe', email: 'jane@x.com', message: 'Hello there' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('accepts a valid contact submission with a CSRF token', async () => {
    const agent = request.agent(app);
    const token = await getToken(agent);

    const res = await agent
      .post('/api/v1/email/contact')
      .set('Origin', ORIGIN)
      .set('x-csrf-token', token)
      .field('fullName', 'Jane Doe')
      .field('email', 'jane@x.com')
      .field('message', 'Hello there, this is a test.')
      .field('cf-turnstile-response', 'test-token');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
  });
});

describe('Validation', () => {
  it('rejects an invalid careers submission (missing fields)', async () => {
    const agent = request.agent(app);
    const token = await getToken(agent);

    const res = await agent
      .post('/api/v1/email/careers')
      .set('Origin', ORIGIN)
      .set('x-csrf-token', token)
      .field('firstName', 'Jane')
      .field('cf-turnstile-response', 'test-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });
});
