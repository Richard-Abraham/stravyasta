import type { Core } from '@strapi/strapi';
import type { ToolHandler } from '../types';

export const getCollectionSchema: ToolHandler = async (args, strapi) => {
  const { uid } = args as any;

  const contentType = strapi.contentType(uid);
  if (!contentType) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: `Content type "${uid}" not found` }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const schema = {
    uid: contentType.uid,
    kind: contentType.kind,
    info: contentType.info,
    attributes: contentType.attributes,
    options: contentType.options,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(schema, null, 2),
      },
    ],
  };
};
