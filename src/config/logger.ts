// Simple console logger with timestamps. No files, no rotation - just stdout,
// which is what PM2/Passenger/Docker already capture for you.

type Meta = Record<string, unknown>;

function write(level: string, message: string, meta?: Meta): void {
  const time = new Date().toISOString();
  const extra = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  console.log(`${time} [${level}] ${message}${extra}`);
}

const logger = {
  info: (message: string, meta?: Meta) => write('info', message, meta),
  warn: (message: string, meta?: Meta) => write('warn', message, meta),
  error: (message: string, meta?: Meta) => write('error', message, meta),
  http: (message: string) => write('http', message),
  // morgan writes access log lines through this stream
  stream: {
    write: (message: string) => write('http', message.trim()),
  },
};

export default logger;
