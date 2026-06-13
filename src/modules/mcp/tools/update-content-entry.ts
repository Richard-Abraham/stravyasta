import type { Core } from '@strapi/strapi';
import type { ToolHandler } from '../types';

export const updateContentEntry: ToolHandler = async (args, strapi) => {
  const { uid, id, data, dryRun = false } = args as any;

  if (!uid || !id || !data) {
    return {
      content: [{ type: 'text', text: 'Missing required params: uid, id, data' }],
      isError: true,
    };
  }

  const existing = await strapi.entityService.findOne(uid, id);
  if (!existing) {
    return {
      content: [{ type: 'text', text: `Entry ${id} not found in ${uid}` }],
      isError: true,
    };
  }

  if (dryRun) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              dryRun: true,
              message: `Preview of update for ${uid}:${id}`,
              before: existing,
              after: { ...existing, ...data },
              wouldUpdate: true,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const updated = await strapi.entityService.update(uid, id, { data });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(updated, null, 2),
      },
    ],
  };
};
