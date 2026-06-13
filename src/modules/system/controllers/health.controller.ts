import type { Core } from '@strapi/strapi';
import { createHealthService } from '../services/health.service';

export function createHealthController({ strapi }: { strapi: Core.Strapi }) {
  const health = createHealthService({ strapi });

  return {
    async live(ctx: any) {
      ctx.body = health.getLiveness();
    },

    async ready(ctx: any) {
      ctx.body = await health.getReadiness();
    },
  };
}
