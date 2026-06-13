import { createHealthService } from '../../../modules/system/services/health.service';

const controller = ({ strapi }: any) => {
  const health = createHealthService({ strapi });

  return {
    async live(ctx: any) {
      ctx.body = health.getLiveness();
    },

    async ready(ctx: any) {
      ctx.body = await health.getReadiness();
    },
  };
};

export default controller;
