import type { Core } from '@strapi/strapi';
import type { HealthStatus, ReadinessStatus } from '../types/health.types';
import { createCacheService } from './cache.service';

export function createHealthService({ strapi }: { strapi: Core.Strapi }) {
  const startTime = Date.now();
  const cache = createCacheService({ strapi });

  return {
    getLiveness(): HealthStatus {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };
    },

    async getReadiness(): Promise<ReadinessStatus> {
      const redis = await cache.ping();

      try {
        await strapi.db.connection.raw('SELECT 1');
        return {
          status: redis === 'fail' ? 'degraded' : 'ok',
          db: 'ok',
          redis,
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000),
        };
      } catch {
        return {
          status: 'degraded',
          db: 'fail',
          redis,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
