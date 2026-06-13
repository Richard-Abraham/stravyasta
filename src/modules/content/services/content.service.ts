import type { Core } from '@strapi/strapi';
import type { ArticleFields, ArticleQuery } from '../types/content.types';

export function createContentService({ strapi }: { strapi: Core.Strapi }) {
  return {
    async findArticles(query: ArticleQuery = {}) {
      const { limit = 10, start = 0, filters = {} } = query;
      return strapi.entityService.findMany('api::article.article', {
        limit,
        start,
        filters,
        populate: '*',
      });
    },

    async findArticleById(id: number) {
      return strapi.entityService.findOne('api::article.article', id, {
        populate: '*',
      });
    },

    async findBySlug(slug: string) {
      const articles = await strapi.entityService.findMany('api::article.article', {
        filters: { slug },
        populate: '*',
        limit: 1,
      }) as any[];
      return articles?.[0] || null;
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;
