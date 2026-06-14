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
    const list = Array.isArray(data) ? data : [];
    ctx.body = {
      data: list,
      meta: { pagination: { page: 1, pageSize: list.length, pageCount: 1, total: list.length } },
    };
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const data = await strapi.service('api::article.article').findArticleById(parseInt(id, 10));
    ctx.body = { data };
  },

  async findBySlug(ctx: any) {
    const { slug } = ctx.params;
    const data = await strapi.service('api::article.article').findBySlug(slug);
    if (!data) {
      ctx.status = 404;
      ctx.body = { data: null, error: { status: 404, name: 'NotFoundError', message: 'Not found', details: {} } };
      return;
    }
    ctx.body = { data };
  },
});

export default controller;
