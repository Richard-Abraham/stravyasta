import type { Core } from '@strapi/strapi';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

const transports = new Map<string, SSEServerTransport>();

export function registerStdioTransport(mcpServer: Server) {
  const transport = new StdioServerTransport();
  return mcpServer.connect(transport);
}

export function registerSSETransport(
  mcpServer: Server,
  { strapi }: { strapi: Core.Strapi }
) {
  const secret = process.env.MCP_AUTH_SECRET;
  const app = express();

  app.get('/mcp/events', async (req, res) => {
    if (secret && req.headers['x-mcp-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionId = (req.query.sessionId as string) || `session_${Date.now()}`;
    const transport = new SSEServerTransport('/mcp/messages', res);
    transports.set(sessionId, transport);

    res.on('close', () => {
      transports.delete(sessionId);
    });

    await mcpServer.connect(transport);
  });

  app.post('/mcp/messages', express.json(), async (req, res) => {
    if (secret && req.headers['x-mcp-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await transport.handlePostMessage(req, res, req.body);
  });

  const port = parseInt(process.env.MCP_PORT || '3001', 10);
  app.listen(port, () => {
    console.log(`[MCP] SSE transport listening on port ${port}`);
  });
}
