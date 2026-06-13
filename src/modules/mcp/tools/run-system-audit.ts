import type { Core } from '@strapi/strapi';
import type { ToolHandler } from '../types';

async function checkDb(strapi: Core.Strapi): Promise<'ok' | 'fail'> {
  try {
    await strapi.db.connection.raw('SELECT 1');
    return 'ok';
  } catch {
    return 'fail';
  }
}

export const runSystemAudit: ToolHandler = async (_args, strapi) => {
  const dbStatus = await checkDb(strapi);

  const plugins: Record<string, string> = {};
  if (strapi.plugin) {
    for (const [name, plugin] of Object.entries(strapi.plugin)) {
      const p = plugin as any;
      if (p?.config) {
        plugins[name] = 'loaded';
      }
    }
  }

  const contentTypes = Object.entries(strapi.contentTypes || {}).map(
    ([uid, ct]) => {
      const c = ct as any;
      return {
        uid,
        kind: c.kind,
        displayName: c.info?.displayName,
      };
    }
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            strapiVersion: strapi.config.get('info.strapi'),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            database: dbStatus,
            plugins,
            contentTypes,
            uptime: process.uptime(),
          },
          null,
          2
        ),
      },
    ],
  };
};
