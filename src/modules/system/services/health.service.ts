import type { Core } from '@strapi/strapi';
import type { HealthStatus, ReadinessStatus } from '../types/health.types';

export function createHealthService({ strapi }: { strapi: Core.Strapi }) {
  const startTime = Date.now();

  return {
    getLiveness(): HealthStatus {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };
    },

    async getReadiness(): Promise<ReadinessStatus> {
      try {
        await strapi.db.connection.raw('SELECT 1');
        return {
          status: 'ok',
          db: 'ok',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000),
        };
      } catch {
        return {
          status: 'degraded',
          db: 'fail',
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
