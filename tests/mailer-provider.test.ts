process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'https://example.com';
process.env.CSRF_SECRET = 'x'.repeat(48);
process.env.MAIL_FROM = 'Website <no-reply@example.com>';
process.env.MAIL_CONTACT_TO = 'info@example.com';
process.env.MAIL_CAREERS_TO = 'careers@example.com';
process.env.ZEPTO_MAIL_URL = 'https://api.zeptomail.in/v1.1/email';
process.env.ZEPTO_MAIL_TOKEN = 'test-token';
process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

describe('mailer provider selection', () => {
  it('uses the ZeptoMail client when the Zoho provider is enabled', async () => {
    jest.resetModules();

    const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'zeptomail-id' });

    jest.mock('zeptomail', () => ({
      SendMailClient: jest.fn().mockImplementation(() => ({
        sendMail: sendMailMock,
      })),
    }), { virtual: true });

    const mailer = (await import('../src/services/mailer.service')).default;

    await mailer.sendMail({
      from: 'Website <no-reply@example.com>',
      to: 'info@example.com',
      subject: 'Test subject',
      text: 'Test body',
    } as any);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });
});
