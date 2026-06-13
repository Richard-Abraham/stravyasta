// Custom Webpack plugin to inject dynamic backend URL at build time
// Enables multi-environment deployments without rebuilding
module.exports = (config, webpack) => {
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.STRAPI_ADMIN_BACKEND_URL': JSON.stringify(
        process.env.STRAPI_ADMIN_BACKEND_URL || ''
      ),
      'process.env.STRAPI_ADMIN_FRONTEND_URL': JSON.stringify(
        process.env.STRAPI_ADMIN_FRONTEND_URL || ''
      ),
    })
  );
  return config;
};
