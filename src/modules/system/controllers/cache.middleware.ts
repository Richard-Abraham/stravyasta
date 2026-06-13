import type { Core } from '@strapi/strapi';
import { createCacheService } from '../services/cache.service';

export function createCacheMiddleware({ strapi }: { strapi: Core.Strapi }) {
  const cache = createCacheService({ strapi });

  const cachedMethods = ['GET'];
  const skipPaths = ['/admin', '/_health', '/graphql', '/uploads', '/i18n'];

  return async (ctx: any, next: any) => {
    if (!cachedMethods.includes(ctx.method) || skipPaths.some((p) => ctx.path.startsWith(p))) {
      return next();
    }

    const key = cache.buildKey(ctx.path, ctx.query);
    const cached = await cache.get(key);

    if (cached) {
      ctx.status = cached.status;
      ctx.body = cached.body;
      ctx.set('X-Cache', 'HIT');
      return;
    }

    await next();

    if (ctx.status < 400) {
      await cache.set(key, {
        body: ctx.body,
        status: ctx.status,
        timestamp: Date.now(),
      });
      ctx.set('X-Cache', 'MISS');
    }
  };
}
