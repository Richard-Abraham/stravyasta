import type { Core } from '@strapi/strapi';
import crypto from 'crypto';

export function createMcpAuth() {
  const secret = process.env.MCP_AUTH_SECRET || '';

  return {
    validateHmac(timestamp: string, signature: string, body: string): boolean {
      if (!secret) return false;

      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(timestamp, 10);
      // Reject timestamps older than 60 seconds (replay protection)
      if (Math.abs(now - ts) > 60) return false;

      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
      } catch {
        return false;
      }
    },

    validateHeader(header: string | undefined): boolean {
      if (!secret) return false;
      if (!header) return false;

      try {
        return crypto.timingSafeEqual(
          Buffer.from(header),
          Buffer.from(secret)
        );
      } catch {
        return false;
      }
    },
  };
}

export type McpAuth = ReturnType<typeof createMcpAuth>;
