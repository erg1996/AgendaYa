import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import baileys from '@whiskeysockets/baileys';
import { config } from './config.js';
import { logger } from './logger.js';
import { notifyDotnet } from './webhook.js';
import { getLimiter, removeLimiter } from './ratelimit.js';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  proto,
} = baileys;

const BAJA_KEYWORDS = ['baja', 'stop', 'unsubscribe', 'cancelar', 'no more', 'no quiero'];

const QR_TIMEOUT_MS = 90_000;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// businessId → Session record
const sessions = new Map();

function validateBusinessId(id) {
  if (!UUID_RE.test(id)) throw new Error('invalid businessId');
  return id;
}

function sessionDir(businessId) {
  return path.join(config.sessionsDir, validateBusinessId(businessId));
}

function createRecord(businessId) {
  return {
    businessId,
    status: 'starting',
    phoneNumber: null,
    lastConnectedAt: null,
    lastQrGeneratedAt: null,
    lastError: null,
    qrPng: null,
    qrExpiresAt: 0,
    sock: null,
    starting: false,
  };
}

function getOrCreate(businessId) {
  let s = sessions.get(businessId);
  if (!s) {
    s = createRecord(businessId);
    sessions.set(businessId, s);
  }
  return s;
}

async function setStatus(s, status, extra = {}) {
  const changed = s.status !== status;
  s.status = status;
  Object.assign(s, extra);
  if (changed) {
    await notifyDotnet(statusToEvent(status), s.businessId, webhookExtra(s, status));
  }
}

function statusToEvent(status) {
  switch (status) {
    case 'connected': return 'session.connected';
    case 'waiting_qr': return 'session.qr_refreshed';
    case 'disconnected': return 'session.disconnected';
    case 'failed': return 'session.failed';
    default: return `session.${status}`;
  }
}

function webhookExtra(s, status) {
  switch (status) {
    case 'connected': return { phoneNumber: s.phoneNumber };
    case 'failed':
    case 'disconnected': return { reason: s.lastError };
    default: return {};
  }
}

export async function startSession(businessId) {
  validateBusinessId(businessId);
  const s = getOrCreate(businessId);
  if (s.starting || s.status === 'connected') {
    return { status: s.status, lastError: s.lastError };
  }
  s.starting = true;
  s.lastError = null;

  try {
    const dir = sessionDir(businessId);
    await fs.mkdir(dir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['AgendaYa', 'Chrome', '1.0'],
      markOnlineOnConnect: false,
      logger: logger.child({ baileys: businessId }),
    });
    s.sock = sock;

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ''
        ).trim().toLowerCase();
        if (BAJA_KEYWORDS.some(k => text.includes(k))) {
          const jid = msg.key.remoteJid ?? '';
          const phone = jid.split('@')[0].replace(/\D/g, '');
          if (phone) {
            logger.info({ businessId, phone }, 'BAJA keyword detected');
            await notifyDotnet('inbound.baja', businessId, { phone });
          }
        }
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        try {
          const png = await QRCode.toBuffer(qr, { type: 'png', width: 320, margin: 1 });
          s.qrPng = png;
          s.qrExpiresAt = Date.now() + QR_TIMEOUT_MS;
          s.lastQrGeneratedAt = new Date().toISOString();
          await setStatus(s, 'waiting_qr');
        } catch (err) {
          logger.error({ err: err.message, businessId }, 'failed to encode QR');
        }
      }
      if (connection === 'open') {
        const me = sock.user?.id?.split(':')[0]?.split('@')[0] ?? null;
        s.phoneNumber = me;
        s.lastConnectedAt = new Date().toISOString();
        s.qrPng = null;
        s.qrExpiresAt = 0;
        await setStatus(s, 'connected');
      } else if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        s.lastError = lastDisconnect?.error?.message || `code ${code}`;
        s.qrPng = null;
        s.qrExpiresAt = 0;
        if (loggedOut) {
          await removeAuth(businessId);
          await setStatus(s, 'disconnected');
          sessions.delete(businessId);
        } else {
          await setStatus(s, 'failed');
        }
      }
    });

    s.starting = false;
    return { status: s.status, lastError: s.lastError };
  } catch (err) {
    s.starting = false;
    s.lastError = err.message;
    await setStatus(s, 'failed');
    logger.error({ err: err.message, businessId }, 'startSession failed');
    return { status: 'failed', lastError: err.message };
  }
}

export function getStatus(businessId) {
  validateBusinessId(businessId);
  const s = sessions.get(businessId);
  if (!s) {
    return {
      status: 'disconnected',
      phoneNumber: null,
      lastConnectedAt: null,
      lastQrGeneratedAt: null,
      lastError: null,
    };
  }
  return {
    status: s.status,
    phoneNumber: s.phoneNumber,
    lastConnectedAt: s.lastConnectedAt,
    lastQrGeneratedAt: s.lastQrGeneratedAt,
    lastError: s.lastError,
  };
}

export function getQr(businessId) {
  validateBusinessId(businessId);
  const s = sessions.get(businessId);
  if (!s || !s.qrPng) return null;
  if (Date.now() > s.qrExpiresAt) {
    s.qrPng = null;
    return null;
  }
  return s.qrPng;
}

export async function disconnectSession(businessId) {
  validateBusinessId(businessId);
  const s = sessions.get(businessId);
  if (s?.sock) {
    try { await s.sock.logout(); } catch { /* ignore */ }
    try { s.sock.end(undefined); } catch { /* ignore */ }
  }
  await removeAuth(businessId);
  sessions.delete(businessId);
  removeLimiter(businessId);
  await notifyDotnet('session.disconnected', businessId, { reason: 'user_disconnect' });
  return true;
}

// Queued send: goes through rate limiter with typing indicator and all anti-ban delays.
// firstConnectedAt / timeZoneId forwarded from .NET so the rate limiter can calculate warm-up tier.
export async function sendMessage(businessId, phone, body, appointmentId, firstConnectedAt, timeZoneId) {
  validateBusinessId(businessId);
  const s = sessions.get(businessId);
  if (!s || s.status !== 'connected' || !s.sock) {
    return { ok: false, reason: 'not_connected' };
  }

  const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
  const limiter = getLimiter(businessId, firstConnectedAt, timeZoneId);

  try {
    await limiter.enqueue({
      phone,
      appointmentId,
      sendTyping: async (durationMs) => {
        try {
          await s.sock.sendPresenceUpdate('composing', jid);
        } catch { /* ignore — non-fatal */ }
      },
      send: async () => {
        await s.sock.sendMessage(jid, { text: body });
      },
    });
    return { ok: true };
  } catch (err) {
    logger.error({ err: err.message, businessId, phone }, 'sendMessage failed');
    return { ok: false, reason: err.message };
  }
}

// Bypass queue — for test messages sent from the business panel.
export async function sendTestMessage(businessId, phone, body) {
  validateBusinessId(businessId);
  const s = sessions.get(businessId);
  if (!s || s.status !== 'connected' || !s.sock) {
    return { ok: false, reason: 'not_connected' };
  }
  const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
  try {
    await s.sock.sendPresenceUpdate('composing', jid);
    await sleep(3_000);
    await s.sock.sendMessage(jid, { text: body });
    return { ok: true };
  } catch (err) {
    logger.error({ err: err.message, businessId, phone }, 'sendTestMessage failed');
    return { ok: false, reason: err.message };
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function removeAuth(businessId) {
  try {
    await fs.rm(sessionDir(businessId), { recursive: true, force: true });
  } catch (err) {
    logger.warn({ err: err.message, businessId }, 'failed to remove auth dir');
  }
}
