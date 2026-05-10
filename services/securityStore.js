/**
 * Security KV abstraction with in-memory fallback.
 * Swap internals later for Redis / Vercel KV without touching business logic.
 */
let kvClient = null;
let providerName = 'memory';
let kvInitTried = false;

const jsonStore = new Map();
const counterStore = new Map();
const setStore = new Map();

function useInMemoryStore() {
  return String(process.env.SECURITY_STORE_MODE || 'memory').toLowerCase() === 'memory';
}

async function initKvClient() {
  if (kvInitTried) return kvClient;
  kvInitTried = true;
  if (useInMemoryStore()) {
    providerName = 'memory';
    return null;
  }
  const mode = String(process.env.SECURITY_STORE_MODE || '').toLowerCase();

  // Optional Vercel KV support if dependency/env exists.
  if (mode === 'vercel') {
    try {
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const maybe = require('@vercel/kv');
      if (maybe && typeof maybe.get === 'function' && typeof maybe.set === 'function') {
        kvClient = maybe;
        providerName = 'vercel-kv';
        return kvClient;
      }
    } catch {
      kvClient = null;
    }
  }

  if (mode === 'redis') {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) return null;
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const Redis = require('ioredis');
      const redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false
      });
      await redis.connect();
      kvClient = redis;
      providerName = 'redis';
      return kvClient;
    } catch {
      kvClient = null;
    }
  }

  providerName = 'memory';
  return kvClient;
}

function nowMs() {
  return Date.now();
}

function withExpiry(value, ttlSec) {
  const ttl = Number(ttlSec);
  return {
    value,
    expiresAt: Number.isFinite(ttl) && ttl > 0 ? nowMs() + ttl * 1000 : null
  };
}

function isExpired(row) {
  return Boolean(row?.expiresAt && row.expiresAt <= nowMs());
}

function getMapValue(map, key) {
  const row = map.get(key);
  if (!row) return null;
  if (isExpired(row)) {
    map.delete(key);
    return null;
  }
  return row.value;
}

async function getJson(key) {
  const kv = await initKvClient();
  if (kv) {
    if (providerName === 'redis') {
      const raw = await kv.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return kv.get(key);
  }
  return getMapValue(jsonStore, key);
}

async function setJson(key, value, ttlSec) {
  const kv = await initKvClient();
  if (kv) {
    if (providerName === 'redis') {
      const payload = JSON.stringify(value);
      if (Number.isFinite(Number(ttlSec)) && Number(ttlSec) > 0) {
        await kv.set(key, payload, 'EX', Number(ttlSec));
        return;
      }
      await kv.set(key, payload);
      return;
    }
    if (Number.isFinite(Number(ttlSec)) && Number(ttlSec) > 0) {
      await kv.set(key, value, { ex: Number(ttlSec) });
      return;
    }
    await kv.set(key, value);
    return;
  }
  jsonStore.set(key, withExpiry(value, ttlSec));
}

async function incrWithTtl(key, ttlSec) {
  const kv = await initKvClient();
  if (kv) {
    if (providerName === 'redis') {
      const n = await kv.incr(key);
      if (n === 1 && Number.isFinite(Number(ttlSec)) && Number(ttlSec) > 0) {
        await kv.expire(key, Number(ttlSec));
      }
      return n;
    }
    const n = await kv.incr(key);
    if (n === 1 && Number.isFinite(Number(ttlSec)) && Number(ttlSec) > 0) {
      await kv.expire(key, Number(ttlSec));
    }
    return n;
  }
  const current = Number(getMapValue(counterStore, key) || 0);
  const next = current + 1;
  counterStore.set(key, withExpiry(next, ttlSec));
  return next;
}

async function saddWithTtl(key, member, ttlSec) {
  const kv = await initKvClient();
  if (kv) {
    if (providerName === 'redis') {
      const added = await kv.sadd(key, member);
      if (added && Number.isFinite(Number(ttlSec)) && Number(ttlSec) > 0) {
        await kv.expire(key, Number(ttlSec));
      }
      return Boolean(added);
    }
    const added = await kv.sadd(key, member);
    if (added && Number.isFinite(Number(ttlSec)) && Number(ttlSec) > 0) {
      await kv.expire(key, Number(ttlSec));
    }
    return Boolean(added);
  }
  const currentSet = getMapValue(setStore, key) || new Set();
  const before = currentSet.size;
  currentSet.add(member);
  setStore.set(key, withExpiry(currentSet, ttlSec));
  return currentSet.size > before;
}

async function scard(key) {
  const kv = await initKvClient();
  if (kv) {
    if (providerName === 'redis') {
      return kv.scard(key);
    }
    return kv.scard(key);
  }
  const set = getMapValue(setStore, key);
  return set ? set.size : 0;
}

async function sismember(key, member) {
  const kv = await initKvClient();
  if (kv) {
    if (providerName === 'redis') {
      const hit = await kv.sismember(key, member);
      return Boolean(hit);
    }
    const hit = await kv.sismember(key, member);
    return Boolean(hit);
  }
  const set = getMapValue(setStore, key);
  return Boolean(set && set.has(member));
}

async function delKey(key) {
  const kv = await initKvClient();
  if (kv) {
    if (providerName === 'redis') {
      await kv.del(key);
      return;
    }
    await kv.del(key);
    return;
  }
  jsonStore.delete(key);
  counterStore.delete(key);
  setStore.delete(key);
}

function getStoreProviderName() {
  return providerName;
}

module.exports = {
  initKvClient,
  getStoreProviderName,
  getJson,
  setJson,
  incrWithTtl,
  saddWithTtl,
  scard,
  sismember,
  delKey
};

