import type { Core } from '@strapi/strapi';
import { bootstrapMcp } from './modules/mcp';
import { createCacheMiddleware } from './modules/system/controllers/cache.middleware';
import { ensureIndexes } from './modules/system/services/migrations.service';
import { ensureAuditTable } from './modules/system/services/setup.service';
import { seedContent } from './seed';
import { ensurePublicPermissions } from './modules/system/services/permissions.service';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // ── DB Setup: indexes + audit table ──
    await ensureIndexes({ strapi });
    await ensureAuditTable({ strapi });

    // ── Redis Cache Middleware ──
    strapi.server.use(createCacheMiddleware({ strapi }));

    // ── Public role read permissions (frontend API consumer) ──
    await ensurePublicPermissions({ strapi });

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

    // ── Demo content seeding (set SEED_DEMO=true) ──
    if (process.env.SEED_DEMO === 'true') {
      await seedContent({ strapi });
    }

    // ── MCP server (gated by ENABLE_MCP=true) ──
    await bootstrapMcp({ strapi });
  },
};
