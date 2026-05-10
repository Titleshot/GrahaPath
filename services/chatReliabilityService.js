const crypto = require('crypto');

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

const RATE_LIMIT_WINDOW_MS = Math.max(1000, envInt('CHAT_RATE_LIMIT_WINDOW_MS', 60_000));
const RATE_LIMIT_MAX_REQUESTS = Math.max(1, envInt('CHAT_RATE_LIMIT_MAX_REQUESTS', 8));

const CACHE_TTL_MS = Math.max(5_000, envInt('CHAT_CACHE_TTL_MS', 5 * 60_000));
const CACHE_MAX_ITEMS = Math.max(10, envInt('CHAT_CACHE_MAX_ITEMS', 500));

const QUEUE_CONCURRENCY = Math.max(1, envInt('GEMINI_QUEUE_CONCURRENCY', 2));
const QUEUE_MAX_SIZE = Math.max(1, envInt('GEMINI_QUEUE_MAX_SIZE', 100));
const QUEUE_WAIT_TIMEOUT_MS = Math.max(2_000, envInt('GEMINI_QUEUE_WAIT_TIMEOUT_MS', 25_000));

const perUserWindow = new Map();
const responseCache = new Map();
const queue = [];
let running = 0;

const stats = {
  rateLimitBlocked: 0,
  queueAccepted: 0,
  queueRejected: 0,
  queueTimeouts: 0,
  queueProcessed: 0,
  cacheHits: 0,
  cacheMisses: 0,
  cacheWrites: 0,
  queuePeak: 0
};

function nowMs() {
  return Date.now();
}

function normalizeText(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 400);
}

function chartDigest(chart) {
  const basis = {
    n: chart?.name || '',
    dt: chart?.utcDateTime || chart?.localDateTime || '',
    p: chart?.place || '',
    L: chart?.ascendant || '',
    M: chart?.moonSign || '',
    S: chart?.sunSign || '',
    md: chart?.astroBrain?.currentDasha?.planet || '',
    ad: chart?.astroBrain?.currentAntardasha?.antarLord || ''
  };
  return crypto.createHash('sha1').update(JSON.stringify(basis)).digest('hex');
}

function buildCacheKey(chart, message) {
  const digest = chartDigest(chart);
  const msg = normalizeText(message);
  return `${digest}:${msg}`;
}

function readCachedReply(cacheKey) {
  const item = responseCache.get(cacheKey);
  if (!item) {
    stats.cacheMisses += 1;
    return null;
  }
  if (item.expiresAt <= nowMs()) {
    responseCache.delete(cacheKey);
    stats.cacheMisses += 1;
    return null;
  }
  stats.cacheHits += 1;
  return item.value;
}

function writeCachedReply(cacheKey, value) {
  if (!cacheKey || !value) return;
  if (responseCache.size >= CACHE_MAX_ITEMS) {
    const first = responseCache.keys().next();
    if (!first.done) responseCache.delete(first.value);
  }
  responseCache.set(cacheKey, {
    value: String(value),
    expiresAt: nowMs() + CACHE_TTL_MS
  });
  stats.cacheWrites += 1;
}

function consumeUserRateToken(userKey) {
  const key = userKey || 'unknown';
  const now = nowMs();
  let slot = perUserWindow.get(key);
  if (!slot || now >= slot.resetAt) {
    slot = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    };
  }

  if (slot.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((slot.resetAt - now) / 1000));
    perUserWindow.set(key, slot);
    stats.rateLimitBlocked += 1;
    return { allowed: false, retryAfterSec };
  }

  slot.count += 1;
  perUserWindow.set(key, slot);
  return { allowed: true, remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - slot.count) };
}

function runNext() {
  while (running < QUEUE_CONCURRENCY && queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    if (item.deadline < nowMs()) {
      stats.queueTimeouts += 1;
      item.reject(new Error('Gemini queue timeout. Please retry shortly.'));
      continue;
    }
    running += 1;
    Promise.resolve()
      .then(item.operation)
      .then((result) => {
        stats.queueProcessed += 1;
        item.resolve(result);
      })
      .catch(item.reject)
      .finally(() => {
        running -= 1;
        runNext();
      });
  }
}

function enqueueGeminiOperation(operation) {
  if (running >= QUEUE_CONCURRENCY && queue.length >= QUEUE_MAX_SIZE) {
    stats.queueRejected += 1;
    const err = new Error('Gemini queue is busy. Please retry in a few seconds.');
    err.statusCode = 503;
    return Promise.reject(err);
  }

  return new Promise((resolve, reject) => {
    queue.push({
      operation,
      resolve,
      reject,
      deadline: nowMs() + QUEUE_WAIT_TIMEOUT_MS
    });
    stats.queueAccepted += 1;
    stats.queuePeak = Math.max(stats.queuePeak, queue.length);
    runNext();
  });
}

function getChatReliabilityStats() {
  return {
    rateLimit: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequestsPerWindow: RATE_LIMIT_MAX_REQUESTS,
      blocked: stats.rateLimitBlocked,
      trackedUsers: perUserWindow.size
    },
    queue: {
      concurrency: QUEUE_CONCURRENCY,
      maxSize: QUEUE_MAX_SIZE,
      waitTimeoutMs: QUEUE_WAIT_TIMEOUT_MS,
      running,
      queued: queue.length,
      accepted: stats.queueAccepted,
      rejected: stats.queueRejected,
      timeouts: stats.queueTimeouts,
      processed: stats.queueProcessed,
      peakQueued: stats.queuePeak
    },
    cache: {
      ttlMs: CACHE_TTL_MS,
      maxItems: CACHE_MAX_ITEMS,
      size: responseCache.size,
      hits: stats.cacheHits,
      misses: stats.cacheMisses,
      writes: stats.cacheWrites
    }
  };
}

module.exports = {
  consumeUserRateToken,
  buildCacheKey,
  readCachedReply,
  writeCachedReply,
  enqueueGeminiOperation,
  getChatReliabilityStats
};
