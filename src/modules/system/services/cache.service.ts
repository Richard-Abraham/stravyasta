import type { Core } from '@strapi/strapi';

type CacheEntry = {
  body: unknown;
  status: number;
  timestamp: number;
};

export function createCacheService({ strapi }: { strapi: Core.Strapi }) {
  const ttl = 3600; // 1 hour default
  const redis = loadRedis();

  function loadRedis() {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) return null;
    try {
      const Redis = require('ioredis');
      const host = process.env.REDIS_HOST || 'redis';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      return new Redis(host, port, {
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
      });
    } catch {
      return null;
    }
  }

  return {
    isAvailable(): boolean {
      return redis !== null && redis.status === 'ready';
    },

    async get(key: string): Promise<CacheEntry | null> {
      if (!redis) return null;
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },

    async set(key: string, entry: CacheEntry, customTtl?: number): Promise<void> {
      if (!redis) return;
      try {
        await redis.set(key, JSON.stringify(entry), 'EX', customTtl || ttl);
      } catch {
        // silently fail
      }
    },

    async invalidate(pattern: string): Promise<void> {
      if (!redis) return;
      try {
        const keys = await redis.keys(pattern);
        if (keys.length) {
          await redis.del(keys);
        }
      } catch {
        // silently fail
      }
    },

    buildKey(uid: string, params?: Record<string, any>): string {
      const base = `cache:${uid}`;
      return params ? `${base}:${JSON.stringify(params)}` : base;
    },
  };
}

export type CacheService = ReturnType<typeof createCacheService>;
