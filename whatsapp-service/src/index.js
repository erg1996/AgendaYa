import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { requireInternalSecret, validateBusinessId } from './auth.js';
import {
  startSession,
  getStatus,
  getQr,
  disconnectSession,
  sendMessage,
  sendTestMessage,
} from './sessions.js';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function recoverSessions() {
  try {
    const entries = await fs.readdir(config.sessionsDir, { withFileTypes: true });
    const ids = entries
      .filter(e => e.isDirectory() && UUID_RE.test(e.name))
      .map(e => e.name);
    if (ids.length === 0) return;
    logger.info({ count: ids.length }, 'recovering sessions from disk');
    await Promise.all(ids.map(id => startSession(id).catch(err =>
      logger.warn({ err: err.message, id }, 'failed to recover session')
    )));
  } catch (err) {
    logger.warn({ err: err.message }, 'recoverSessions skipped');
  }
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'agendaya-whatsapp', ts: new Date().toISOString() });
});

app.get('/ping', requireInternalSecret, (_req, res) => {
  res.json({ pong: true });
});

app.post('/sessions/:businessId/start', requireInternalSecret, validateBusinessId, async (req, res, next) => {
  try {
    const result = await startSession(req.params.businessId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/sessions/:businessId/status', requireInternalSecret, validateBusinessId, (req, res, next) => {
  try {
    res.json(getStatus(req.params.businessId));
  } catch (err) {
    next(err);
  }
});

app.get('/sessions/:businessId/qr', requireInternalSecret, validateBusinessId, (req, res, next) => {
  try {
    const png = getQr(req.params.businessId);
    if (!png) return res.status(404).json({ error: 'no_qr_available' });
    res.set('content-type', 'image/png');
    res.set('cache-control', 'no-store');
    res.send(png);
  } catch (err) {
    next(err);
  }
});

app.delete('/sessions/:businessId', requireInternalSecret, validateBusinessId, async (req, res, next) => {
  try {
    await disconnectSession(req.params.businessId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.post('/sessions/:businessId/send', requireInternalSecret, validateBusinessId, async (req, res, next) => {
  try {
    const { to, body, appointmentId, firstConnectedAt, timeZoneId } = req.body ?? {};
    if (!to || !body) return res.status(400).json({ error: 'to and body required' });
    const result = await sendMessage(
      req.params.businessId, to, body, appointmentId, firstConnectedAt, timeZoneId
    );
    if (!result.ok) return res.status(409).json(result);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/sessions/:businessId/send-test', requireInternalSecret, validateBusinessId, async (req, res, next) => {
  try {
    const { to, body } = req.body ?? {};
    if (!to || !body) return res.status(400).json({ error: 'to and body required' });
    const result = await sendTestMessage(req.params.businessId, to, body);
    if (!result.ok) return res.status(409).json(result);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  logger.error({ err: err.message }, 'unhandled error');
  res.status(500).json({ error: 'internal' });
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'whatsapp-service listening');
  recoverSessions();
});

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
