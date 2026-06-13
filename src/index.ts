import type { Core } from '@strapi/strapi';
import { bootstrapMcp } from './modules/mcp';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // ── Admin auto-creation on first run ──
    const email = process.env.STRAPI_ADMIN_EMAIL;
    const password = process.env.STRAPI_ADMIN_PASSWORD;

    if (email && password) {
      try {
        const userService = strapi.admin?.services?.user;
        if (userService) {
          const existing = await userService.findOneByEmail(email);
          if (!existing) {
            await userService.create({
              email,
              password,
              firstname: process.env.STRAPI_ADMIN_FIRSTNAME || 'Admin',
              lastname: process.env.STRAPI_ADMIN_LASTNAME || 'User',
              isActive: true,
              roles: [1],
            });
          }
        }
      } catch {
        // Admin service not ready yet
      }
    }

    // ── MCP server (gated by ENABLE_MCP=true) ──
    await bootstrapMcp({ strapi });
  },
};
