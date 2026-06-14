import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      const data = await strapi.service('api::theme-setting.theme-setting').getTheme();
      ctx.body = { data };
    } catch {
      ctx.body = {
        data: {
          brandName: 'Sattva',
          primaryColor: '#7C3AED',
          secondaryColor: '#A855F7',
          accentColor: '#F3E8FF',
          fontFamily: 'Inter',
          borderRadius: 'medium',
          layoutStyle: 'default',
          footerText: 'All rights reserved.',
        },
      };
    }
  },
});

export default controller;
