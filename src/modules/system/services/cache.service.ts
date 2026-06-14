import type { Core } from '@strapi/strapi';

type CacheEntry = {
  body: unknown;
  status: number;
  timestamp: number;
};

const DEFAULT_TTL = 3600; // 1 hour

const contentTypeTtls: Record<string, number> = {
  'api::article.article': 600,   // 10 min — content changes frequently
  'api::page.page': 600,          // 10 min
  'api::navigation.navigation': 3600, // 1 hour — rarely changes
  'api::category.category': 3600,
  'api::tag.tag': 3600,
};

export function createCacheService({ strapi }: { strapi: Core.Strapi }) {
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
        const resolvedTtl = customTtl ?? resolveTtl(key);
        await redis.set(key, JSON.stringify(entry), 'EX', resolvedTtl);
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

    getTtl(uid: string): number {
      return contentTypeTtls[uid] ?? DEFAULT_TTL;
    },
  };
}

function resolveTtl(key: string): number {
  for (const [uid, ttl] of Object.entries(contentTypeTtls)) {
    if (key.includes(uid)) return ttl;
  }
  return DEFAULT_TTL;
}

export type CacheService = ReturnType<typeof createCacheService>;
