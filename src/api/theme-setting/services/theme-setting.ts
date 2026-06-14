import type { Core } from '@strapi/strapi';

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getTheme() {
    const entity = await strapi.entityService.findOne('api::theme-setting.theme-setting' as any, 1, {
      populate: ['logo', 'favicon'],
    });

    if (!entity) {
      return null;
    }

    const e = entity as any;
    const logoUrl = e.logo?.url
      ? `${process.env.S3_PUBLIC_URL || 'http://localhost:1337'}${e.logo.url}`
      : null;
    const faviconUrl = e.favicon?.url
      ? `${process.env.S3_PUBLIC_URL || 'http://localhost:1337'}${e.favicon.url}`
      : null;

    return {
      brandName: e.brandName || 'Sattva',
      primaryColor: e.primaryColor || '#7C3AED',
      secondaryColor: e.secondaryColor || '#A855F7',
      accentColor: e.accentColor || '#F3E8FF',
      fontFamily: e.fontFamily || 'Inter',
      borderRadius: e.borderRadius || 'medium',
      layoutStyle: e.layoutStyle || 'default',
      logo: logoUrl,
      favicon: faviconUrl,
      customCss: e.customCss || null,
      footerText: e.footerText || 'All rights reserved.',
      updatedAt: e.updatedAt,
    };
  },
});

export default service;
