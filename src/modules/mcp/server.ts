import type { Core } from '@strapi/strapi';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createAllowlist } from './allowlist';
import { queryContentCollection } from './tools/query-content-collection';
import { getCollectionSchema } from './tools/get-collection-schema';
import { runSystemAudit } from './tools/run-system-audit';
import { createContentEntry } from './tools/create-content-entry';
import { updateContentEntry } from './tools/update-content-entry';
import { publishEntry } from './tools/publish-entry';
import type { ToolDefinition, ToolHandler } from './types';

const READ_TOOLS = ['query_content_collection', 'get_collection_schema'];
const WRITE_TOOLS = ['create_content_entry', 'update_content_entry', 'publish_entry'];
const ALL_TOOLS = [...READ_TOOLS, ...WRITE_TOOLS];

const toolDefinitions: ToolDefinition[] = [
  {
    name: 'query_content_collection',
    description: 'Fetches paginated content entries for a given Collection UID.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: { type: 'string', description: 'e.g. api::article.article' },
        limit: { type: 'number', default: 10 },
        start: { type: 'number', default: 0 },
        filters: { type: 'object', description: 'Strapi REST filter object' },
        populate: { type: 'string', description: 'Fields to populate' },
      },
      required: ['uid'],
    },
  },
  {
    name: 'get_collection_schema',
    description: 'Returns field definitions for a Content Type UID.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: { type: 'string', description: 'e.g. api::article.article' },
      },
      required: ['uid'],
    },
  },
  {
    name: 'run_system_audit',
    description: 'Returns Strapi version, plugins, content types, and DB health.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_content_entry',
    description: 'Creates a new content entry for a given UID. Use dry_run:true to preview.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: { type: 'string', description: 'e.g. api::article.article' },
        data: { type: 'object', description: 'Entry fields to create' },
        dryRun: { type: 'boolean', default: false },
      },
      required: ['uid', 'data'],
    },
  },
  {
    name: 'update_content_entry',
    description: 'Updates an existing content entry by UID and ID. Use dry_run:true to preview.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: { type: 'string', description: 'e.g. api::article.article' },
        id: { type: 'number', description: 'Entry ID to update' },
        data: { type: 'object', description: 'Fields to patch' },
        dryRun: { type: 'boolean', default: false },
      },
      required: ['uid', 'id', 'data'],
    },
  },
  {
    name: 'publish_entry',
    description: 'Publishes or unpublishes a content entry. Set publish:false to unpublish.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: { type: 'string', description: 'e.g. api::article.article' },
        id: { type: 'number', description: 'Entry ID' },
        publish: { type: 'boolean', default: true },
        dryRun: { type: 'boolean', default: false },
      },
      required: ['uid', 'id'],
    },
  },
];

const toolHandlers: Record<string, ToolHandler> = {
  query_content_collection: queryContentCollection,
  get_collection_schema: getCollectionSchema,
  run_system_audit: runSystemAudit,
  create_content_entry: createContentEntry,
  update_content_entry: updateContentEntry,
  publish_entry: publishEntry,
};

function simpleRateLimiter(windowMs: number, maxRequests: number) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string): boolean {
      const now = Date.now();
      const window = now - windowMs;
      const timestamps = (hits.get(key) || []).filter((t) => t > window);
      timestamps.push(now);
      hits.set(key, timestamps);
      return timestamps.length <= maxRequests;
    },
  };
}

export async function createMcpServer({ strapi }: { strapi: Core.Strapi }) {
  const allowlist = createAllowlist(
    process.env.MCP_ALLOWLIST ? process.env.MCP_ALLOWLIST.split(',') : undefined
  );

  const rateLimit = simpleRateLimiter(
    60_000,
    parseInt(process.env.MCP_RATE_LIMIT || '60', 10)
  );

  const writeAccess = process.env.MCP_WRITE_ENABLED === 'true';

  const mcpServer = new Server(
    { name: 'strapi-mcp-service', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Rate limit
    const ip = (request as any).sessionId || 'global';
    if (!rateLimit.check(ip)) {
      return {
        content: [{ type: 'text', text: 'Rate limit exceeded (60 req/min)' }],
        isError: true,
      };
    }

    // Unknown tool
    const handler = toolHandlers[name];
    if (!handler) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    // Write tool gate
    if (WRITE_TOOLS.includes(name) && !writeAccess) {
      return {
        content: [{ type: 'text', text: 'Write operations are disabled. Set MCP_WRITE_ENABLED=true to enable.' }],
        isError: true,
      };
    }

    // UID allowlist for content-type tools
    if (READ_TOOLS.includes(name) || WRITE_TOOLS.includes(name)) {
      const uid = (args as any)?.uid;
      if (uid && !allowlist.isAllowed(uid)) {
        return {
          content: [{ type: 'text', text: `Access denied: "${uid}" is not in the allowlist` }],
          isError: true,
        };
      }
    }

    try {
      const result = await handler(args, strapi);
      console.log(`[MCP] ${name} called`);
      return result;
    } catch (err: any) {
      console.error(`[MCP] Error in ${name}:`, err.message);
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  return { mcpServer, allowlist };
}
