import type { Core } from '@strapi/strapi';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface ToolHandler {
  (args: Record<string, any>, strapi: Core.Strapi): Promise<any>;
}
