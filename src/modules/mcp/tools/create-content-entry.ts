import type { Core } from '@strapi/strapi';
import type { ToolHandler } from '../types';

export const createContentEntry: ToolHandler = async (args, strapi) => {
  const { uid, data, dryRun = false } = args as any;

  if (!uid || !data) {
    return {
      content: [{ type: 'text', text: 'Missing required params: uid, data' }],
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
              message: `Preview of create for ${uid}`,
              data,
              wouldCreate: true,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const entry = await strapi.entityService.create(uid, { data });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ id: entry.id, ...entry }, null, 2),
      },
    ],
  };
};
