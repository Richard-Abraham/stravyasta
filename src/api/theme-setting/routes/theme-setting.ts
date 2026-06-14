export default {
  routes: [
    {
      method: 'GET',
      path: '/theme-setting',
      handler: 'theme-setting.find',
      config: { auth: false },
    },
  ],
};
