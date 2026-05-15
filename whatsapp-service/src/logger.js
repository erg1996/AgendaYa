import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers["x-internal-secret"]', 'body.body', 'body.authState', 'creds'],
    censor: '[redacted]',
  },
});
