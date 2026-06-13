import type { Core } from '@strapi/strapi';
import type { ToolHandler } from '../types';

export const queryContentCollection: ToolHandler = async (args, strapi) => {
  const { uid, limit = 10, start = 0, filters = {}, populate } = args as any;

  const data = await strapi.entityService.findMany(uid, {
    limit: Math.min(limit, 100),
    start,
    filters,
    populate: populate || '*',
  });

  const total = Array.isArray(data) ? data.length : 0;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ data, total, limit, start }, null, 2),
      },
    ],
  };
};
