// PM2 Ecosystem Configuration
// For non-Kubernetes deployments (e.g., bare VPS) where Dokploy is not used.
// Dokploy handles process management natively — this file is a fallback.

module.exports = {
  apps: [
    {
      name: 'strapi-api',
      script: 'pnpm',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        ENABLE_MCP: 'false',
      },
      env_production: {
        NODE_ENV: 'production',
        ENABLE_MCP: 'false',
      },
    },
    {
      name: 'strapi-mcp',
      script: 'pnpm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        ENABLE_MCP: 'true',
        MCP_TRANSPORT: 'sse',
        MCP_PORT: '3001',
      },
      env_production: {
        NODE_ENV: 'production',
        ENABLE_MCP: 'true',
        MCP_TRANSPORT: 'sse',
        MCP_PORT: '3001',
      },
    },
  ],
};
