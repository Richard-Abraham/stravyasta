import type { Core } from '@strapi/strapi';
import { createMcpServer } from './server';
import { registerStdioTransport, registerSSETransport } from './transport';

export async function bootstrapMcp({ strapi }: { strapi: Core.Strapi }) {
  if (process.env.ENABLE_MCP !== 'true') {
    console.log('[MCP] Disabled (ENABLE_MCP != true)');
    return;
  }

  console.log('[MCP] Initializing MCP server...');
  const { mcpServer } = await createMcpServer({ strapi });

  const transportType = process.env.MCP_TRANSPORT || 'sse';

  if (transportType === 'stdio') {
    await registerStdioTransport(mcpServer);
    console.log('[MCP] Stdio transport connected');
  } else {
    registerSSETransport(mcpServer, { strapi });
    console.log(`[MCP] SSE transport registered on port ${process.env.MCP_PORT || 3001}`);
  }
}
