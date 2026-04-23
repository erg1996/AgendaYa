import { config, timingSafeEquals } from './config.js';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function requireInternalSecret(req, res, next) {
  const presented = req.header('x-internal-secret') || '';
  if (!timingSafeEquals(presented, config.internalSecret)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

export function validateBusinessId(req, res, next) {
  const id = req.params.businessId;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ error: 'invalid businessId' });
  }
  next();
}
