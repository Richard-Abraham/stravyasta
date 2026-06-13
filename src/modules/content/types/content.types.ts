import type { Core } from '@strapi/strapi';

export interface ArticleFields {
  title: string;
  slug?: string;
  excerpt?: string;
  body: string;
  coverImage?: number;
  category?: number;
  tags?: number[];
  author?: number;
}

export interface ArticleQuery {
  limit?: number;
  start?: number;
  filters?: Record<string, any>;
  populate?: string | string[];
}
