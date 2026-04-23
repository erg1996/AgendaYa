import { config } from './config.js';
import { logger } from './logger.js';

export async function notifyDotnet(event, businessId, extra = {}) {
  if (!config.dotnetWebhookUrl) {
    logger.debug({ event, businessId }, 'dotnet webhook url not configured, skipping');
    return;
  }
  const body = { businessId, event, ...extra };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(config.dotnetWebhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-secret': config.internalSecret,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        logger.info({ event, businessId }, 'webhook delivered');
        return;
      }
      logger.warn({ event, businessId, status: res.status, attempt }, 'webhook non-2xx');
    } catch (err) {
      logger.warn({ event, businessId, err: err.message, attempt }, 'webhook attempt failed');
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  logger.error({ event, businessId }, 'webhook exhausted retries');
}
