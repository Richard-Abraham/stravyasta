export default {
  routes: [
    {
      method: 'GET',
      path: '/health/live',
      handler: 'health.live',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/health/ready',
      handler: 'health.ready',
      config: { auth: false },
    },
  ],
};
