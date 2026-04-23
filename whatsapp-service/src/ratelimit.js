import { logger } from './logger.js';

// Anti-ban send queue per session.
// Enforces: warm-up daily limits, 20/hr max, 45-120s inter-message delays,
// 3-8s typing indicator, 08-21 business-timezone window, 18h between same phone.

const WARMUP_TIERS = [
  { maxDays: 3,        dailyLimit: 10  },
  { maxDays: 7,        dailyLimit: 20  },
  { maxDays: 14,       dailyLimit: 50  },
  { maxDays: Infinity, dailyLimit: 100 },
];

const HOURLY_LIMIT         = 20;
const MIN_DELAY_MS         = 45_000;
const MAX_DELAY_MS         = 120_000;
const TYPING_MIN_MS        = 3_000;
const TYPING_MAX_MS        = 8_000;
const SAME_PHONE_MIN_MS    = 18 * 3_600_000; // 18 hours

const limiters = new Map();

export function getLimiter(businessId, firstConnectedAt, timeZoneId) {
  let l = limiters.get(businessId);
  if (!l) {
    l = new RateLimiter(businessId, firstConnectedAt, timeZoneId);
    limiters.set(businessId, l);
  } else {
    if (firstConnectedAt) l.firstConnectedAt = new Date(firstConnectedAt);
    if (timeZoneId)       l.timeZoneId = timeZoneId;
  }
  return l;
}

export function removeLimiter(businessId) {
  limiters.delete(businessId);
}

class RateLimiter {
  constructor(businessId, firstConnectedAt, timeZoneId) {
    this.businessId      = businessId;
    this.firstConnectedAt = firstConnectedAt ? new Date(firstConnectedAt) : new Date();
    this.timeZoneId      = timeZoneId || 'UTC';
    this.queue           = [];
    this.processing      = false;

    // Rolling counters
    this._hourStart = Date.now();
    this._sentHour  = 0;
    this._dayStart  = Date.now();
    this._sentDay   = 0;

    // phone → timestamp of last send
    this._lastSent = new Map();
  }

  get _dailyLimit() {
    const days = Math.floor((Date.now() - this.firstConnectedAt.getTime()) / 86_400_000);
    return WARMUP_TIERS.find(t => days <= t.maxDays)?.dailyLimit ?? 100;
  }

  _refreshCounters() {
    const now = Date.now();
    if (now - this._hourStart > 3_600_000) { this._sentHour = 0; this._hourStart = now; }
    if (now - this._dayStart  > 86_400_000) { this._sentDay  = 0; this._dayStart  = now; }
  }

  _localHour() {
    try {
      const v = new Intl.DateTimeFormat('en-US', {
        timeZone: this.timeZoneId, hour: 'numeric', hour12: false,
      }).format(new Date());
      const h = parseInt(v, 10);
      return isNaN(h) ? new Date().getHours() : h;
    } catch {
      return new Date().getHours();
    }
  }

  _msUntilWindowOpens() {
    const h = this._localHour();
    if (h >= 8 && h < 21) return 0;
    return h < 8 ? (8 - h) * 3_600_000 : (32 - h) * 3_600_000; // 32 = 24+8
  }

  // Returns a Promise that resolves with { ok, skipped, reason } or rejects on send error.
  // task: { phone, sendTyping(durationMs), send() }
  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...task, resolve, reject });
      if (!this.processing) this._process();
    });
  }

  async _process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const waitWindow = this._msUntilWindowOpens();
      if (waitWindow > 0) {
        logger.info({ businessId: this.businessId, waitMs: waitWindow }, 'outside send window');
        await sleep(waitWindow);
      }

      this._refreshCounters();

      if (this._sentDay >= this._dailyLimit) {
        logger.info({ businessId: this.businessId }, 'daily limit reached, pausing 1h');
        await sleep(3_600_000);
        continue;
      }
      if (this._sentHour >= HOURLY_LIMIT) {
        logger.info({ businessId: this.businessId }, 'hourly limit reached, pausing 5m');
        await sleep(300_000);
        continue;
      }

      const task = this.queue.shift();

      const lastSent = this._lastSent.get(task.phone);
      if (lastSent && Date.now() - lastSent < SAME_PHONE_MIN_MS) {
        logger.info({ businessId: this.businessId, phone: task.phone }, 'skipping: 18h interval');
        task.resolve({ ok: false, skipped: true, reason: 'min_interval' });
        continue;
      }

      try {
        const typingMs = rand(TYPING_MIN_MS, TYPING_MAX_MS);
        await task.sendTyping(typingMs);
        await sleep(typingMs);

        await task.send();

        this._sentHour++;
        this._sentDay++;
        this._lastSent.set(task.phone, Date.now());
        task.resolve({ ok: true });
      } catch (err) {
        task.reject(err);
      }

      if (this.queue.length > 0) {
        await sleep(rand(MIN_DELAY_MS, MAX_DELAY_MS));
      }
    }
    this.processing = false;
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
