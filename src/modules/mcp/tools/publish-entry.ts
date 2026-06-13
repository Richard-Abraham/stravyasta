import type { Core } from '@strapi/strapi';
import type { ToolHandler } from '../types';

export const publishEntry: ToolHandler = async (args, strapi) => {
  const { uid, id, publish = true, dryRun = false } = args as any;

  if (!uid || !id) {
    return {
      content: [{ type: 'text', text: 'Missing required params: uid, id' }],
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
              message: publish
                ? `Preview of publish for ${uid}:${id}`
                : `Preview of unpublish for ${uid}:${id}`,
              currentStatus: (existing as any).publishedAt ? 'published' : 'draft',
              wouldChange: true,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const updated = await strapi.entityService.update(uid, id, {
    data: {
      publishedAt: publish ? new Date().toISOString() : null,
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            id: updated.id,
            publishedAt: (updated as any).publishedAt,
            status: (updated as any).publishedAt ? 'published' : 'draft',
          },
          null,
          2
        ),
      },
    ],
  };
};
