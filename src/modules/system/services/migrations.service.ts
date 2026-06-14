import type { Core } from '@strapi/strapi';

export async function ensureIndexes({ strapi }: { strapi: Core.Strapi }) {
  try {
    await strapi.db.connection.raw(`
      CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug);
    `);
    await strapi.db.connection.raw(`
      CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles (category_id);
    `);
    await strapi.db.connection.raw(`
      CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages (slug);
    `);
  } catch {
    // Indexes might already exist or DB doesn't support (SQLite)
  }
}
