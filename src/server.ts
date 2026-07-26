import http from 'http';
import app from './app';
import config from './config';
import logger from './config/logger';
import mailer from './services/mailer.service';

let server: http.Server | undefined;

async function start(): Promise<void> {
  // Check SMTP works at boot so a bad config is loud and immediate.
  await mailer.verifyConnection();

  server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port} [${config.env}]`);
  });

  server.on('error', (err: Error) => {
    logger.error(`Server error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}

function shutdown(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  if (!server) process.exit(0);

  server.close(() => {
    mailer.close();
    logger.info('Server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));

process.on('unhandledRejection', (reason: unknown) => {
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error(`Unhandled Rejection: ${reason}`, { stack });
});

process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

start();

export default app; // used by Passenger and by tests
