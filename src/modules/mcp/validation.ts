import type { Core } from '@strapi/strapi';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_UIDS = [
  'api::article.article',
  'api::page.page',
  'api::category.category',
  'api::tag.tag',
  'api::navigation.navigation',
];

export function validateMcpInput(tool: string, args: any): ValidationResult {
  const errors: string[] = [];

  if (!args || typeof args !== 'object') {
    return { valid: false, errors: ['Arguments must be an object'] };
  }

  // All content tools require a uid
  const contentTools = [
    'query_content_collection',
    'get_collection_schema',
    'create_content_entry',
    'update_content_entry',
    'publish_entry',
  ];

  if (contentTools.includes(tool)) {
    if (!args.uid || typeof args.uid !== 'string') {
      errors.push('uid is required and must be a string');
    } else if (!VALID_UIDS.includes(args.uid)) {
      errors.push(`Invalid uid: "${args.uid}". Must be one of: ${VALID_UIDS.join(', ')}`);
    }
  }

  // Write tool validation
  if (tool === 'create_content_entry') {
    if (!args.data || typeof args.data !== 'object') {
      errors.push('data is required and must be an object');
    }
  }

  if (tool === 'update_content_entry') {
    if (!args.id && args.id !== 0) {
      errors.push('id is required');
    }
    if (!args.data || typeof args.data !== 'object') {
      errors.push('data is required and must be an object');
    }
  }

  if (tool === 'publish_entry') {
    if (!args.id && args.id !== 0) {
      errors.push('id is required');
    }
  }

  // Pagination validation
  if (tool === 'query_content_collection') {
    if (args.limit !== undefined && (typeof args.limit !== 'number' || args.limit < 1 || args.limit > 100)) {
      errors.push('limit must be a number between 1 and 100');
    }
  }

  return { valid: errors.length === 0, errors };
}
