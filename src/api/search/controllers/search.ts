import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async search(ctx: any) {
    const query = (ctx.query.q || '').trim();
    const limit = Math.min(parseInt(ctx.query.limit || '10', 10), 50);

    if (!query) {
      ctx.body = { data: [], meta: { query: '', total: 0 } };
      return;
    }

    try {
      const results = await strapi.db.connection.raw(
        `SELECT id, title, slug, excerpt, created_at, updated_at,
                ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body,'')),
                        plainto_tsquery('english', ?)) AS rank
         FROM articles
         WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body,''))
               @@ plainto_tsquery('english', ?)
         ORDER BY rank DESC
         LIMIT ?`,
        [query, query, limit]
      );

      // Fallback for SQLite (doesn't support tsvector)
      if (!results?.rows?.length && !Array.isArray(results)) {
        const fallback = await strapi.db.connection.raw(
          `SELECT id, title, slug, excerpt, created_at, updated_at
           FROM articles
           WHERE title LIKE ? OR excerpt LIKE ? OR body LIKE ?
           LIMIT ?`,
          [`%${query}%`, `%${query}%`, `%${query}%`, limit]
        );
        const rows = fallback?.rows || fallback || [];
        ctx.body = { data: rows, meta: { query, total: rows.length } };
        return;
      }

      const rows = results?.rows || results || [];
      ctx.body = { data: rows, meta: { query, total: rows.length } };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { data: null, error: 'Search failed', meta: { query } };
    }
  },
});

export default controller;
