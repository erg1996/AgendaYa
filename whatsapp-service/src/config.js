import crypto from 'node:crypto';

function required(name) {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  internalSecret: required('INTERNAL_SECRET'),
  sessionsDir: process.env.SESSIONS_DIR || '/app/data',
  dotnetWebhookUrl: process.env.DOTNET_WEBHOOK_URL || '',
  nodeEnv: process.env.NODE_ENV || 'production',
};

export function timingSafeEquals(a, b) {
  const ab = Buffer.from(a || '', 'utf8');
  const bb = Buffer.from(b || '', 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
