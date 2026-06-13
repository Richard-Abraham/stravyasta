import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: [],
    auth: {
      logo: '/uploads/logo-login.svg',
    },
    menu: {
      logo: '/uploads/logo-sidebar.svg',
    },
    head: {
      favicon: '/uploads/favicon.svg',
    },
    tutorials: false,
    notifications: {
      releases: false,
    },
  },
  bootstrap(app: StrapiApp) {
    // App initialization logic here
  },
};
