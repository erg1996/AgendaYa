import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { requireInternalSecret } from './auth.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'agendaya-whatsapp', ts: new Date().toISOString() });
});

app.get('/ping', requireInternalSecret, (_req, res) => {
  res.json({ pong: true });
});

app.use((err, _req, res, _next) => {
  logger.error({ err: err.message }, 'unhandled error');
  res.status(500).json({ error: 'internal' });
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'whatsapp-service listening');
});

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
