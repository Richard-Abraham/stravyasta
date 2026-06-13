import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    const { limit, start, filters, populate } = ctx.query;
    const data = await strapi.service('api::article.article').findArticles({
      limit: limit ? parseInt(limit, 10) : 10,
      start: start ? parseInt(start, 10) : 0,
      filters,
      populate,
    });
    ctx.body = data;
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const data = await strapi.service('api::article.article').findArticleById(parseInt(id, 10));
    ctx.body = data;
  },

  async findBySlug(ctx: any) {
    const { slug } = ctx.params;
    const data = await strapi.service('api::article.article').findBySlug(slug);
    if (!data) {
      ctx.status = 404;
      ctx.body = { error: 'Not found' };
      return;
    }
    ctx.body = data;
  },
});

export default controller;
