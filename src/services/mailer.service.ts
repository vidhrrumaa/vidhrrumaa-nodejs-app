import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import config from '../config';
import logger from '../config/logger';

// Single shared SMTP connection pool. Everything that sends mail goes
// through here, so swapping providers later is a one-file change.
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const smtpPort = 465;
  const smtpSecure = true;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: smtpPort,
    secure: smtpSecure,
    auth: config.smtp.auth,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  logger.info('SMTP transport config', {
    host: config.smtp.host,
    port: smtpPort,
    secure: smtpSecure,
    user: config.smtp.auth.user,
  });

  return transporter;
}

// Checked once at startup so a bad SMTP config is loud, not silent.
async function verifyConnection(): Promise<boolean> {
  try {
    logger.info('Starting SMTP verification', {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
    });

    await getTransporter().verify();
    logger.info('SMTP transport verified and ready');
    return true;
  } catch (err) {
    const error = err as Error;
    logger.error(`SMTP verification failed: ${error.message}`, { stack: error.stack });
    return false;
  }
}

async function sendMail(message: SendMailOptions): Promise<{ messageId: string }> {
  const info = await getTransporter().sendMail(message);
  logger.info('Email sent', { messageId: info.messageId });
  return { messageId: info.messageId };
}

function close(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}

export { getTransporter, verifyConnection, sendMail, close };
export default { getTransporter, verifyConnection, sendMail, close };
