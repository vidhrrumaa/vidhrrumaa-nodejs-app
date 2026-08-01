import { SendMailOptions } from 'nodemailer';
import { SendMailClient } from 'zeptomail';
import config from '../config';
import logger from '../config/logger';

type ZeptoClient = {
  sendMail: (payload: unknown) => Promise<unknown>;
};

let zeptoClient: ZeptoClient | null = null;

type MailAddress = {
  address: string;
  name?: string;
};

type ZeptoRecipient = {
  email_address: MailAddress;
};

type ZeptoPayload = {
  from: MailAddress;
  to: ZeptoRecipient[];
  subject?: string;
  htmlbody?: string;
  textbody?: string;
};

function parseAddress(address: string | MailAddress): MailAddress {
  if (typeof address === 'string') {
    const trimmed = address.trim();
    const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        address: match[2].trim(),
      };
    }

    return { address: trimmed };
  }

  return {
    address: address.address,
    name: address.name,
  };
}

function normalizeRecipients(recipients?: SendMailOptions['to']): ZeptoRecipient[] {
  if (!recipients) return [];

  const batch = Array.isArray(recipients) ? recipients : [recipients];

  return batch.map((recipient) => {
    const parsed = typeof recipient === 'string' ? parseAddress(recipient) : parseAddress(recipient as MailAddress);
    return {
      email_address: {
        address: parsed.address,
        name: parsed.name ?? parsed.address,
      },
    };
  });
}

function getZeptoClient(): ZeptoClient {
  if (zeptoClient) return zeptoClient;

  if (!config.zeptoMail.url || !config.zeptoMail.token) {
    throw new Error('ZEPTO_MAIL_URL and ZEPTO_MAIL_TOKEN must be set when MAIL_PROVIDER=zoho');
  }

  zeptoClient = new SendMailClient({
    url: config.zeptoMail.url,
    token: config.zeptoMail.token,
  }) as unknown as ZeptoClient;

  return zeptoClient;
}

function toZeptoPayload(message: SendMailOptions): ZeptoPayload {
  const from = parseAddress(message.from as string | MailAddress);
  const htmlbody = typeof message.html === 'string' ? message.html : undefined;
  const textbody = typeof message.text === 'string' ? message.text : undefined;

  return {
    from: {
      address: from.address,
      name: from.name ?? from.address,
    },
    to: normalizeRecipients(message.to),
    subject: typeof message.subject === 'string' ? message.subject : undefined,
    htmlbody,
    textbody,
  };
}

// Validate the API mailer configuration once at startup.
async function verifyConnection(): Promise<boolean> {
  try {
    if (!config.zeptoMail.url || !config.zeptoMail.token) {
      throw new Error('ZEPTO_MAIL_URL and ZEPTO_MAIL_TOKEN must be configured');
    }

    logger.info('[DEBUG ZEPTO MAIL] provider enabled', {
      url: config.zeptoMail.url,
    });
    return true;
  } catch (err) {
    const error = err as Error;
    logger.error(`ZeptoMail configuration validation failed: ${error.message}`, { stack: error.stack });
    return false;
  }
}

async function sendMail(message: SendMailOptions): Promise<{ messageId: string }> {
  const payload = toZeptoPayload(message);
  await getZeptoClient().sendMail(payload as never);
  logger.info('Email sent via ZeptoMail');
  return { messageId: 'zeptomail-send' };
}

function close(): void {
  zeptoClient = null;
}

export { getZeptoClient, verifyConnection, sendMail, close };
export default { getZeptoClient, verifyConnection, sendMail, close };
