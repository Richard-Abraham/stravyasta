import type { Core } from '@strapi/strapi';

export async function ensureAuditTable({ strapi }: { strapi: Core.Strapi }) {
  try {
    await strapi.db.connection.raw(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        resource_id VARCHAR(255),
        user_id INTEGER,
        ip VARCHAR(45),
        payload TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // SQLite-compatible version
  } catch {
    try {
      await strapi.db.connection.raw(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          resource_id TEXT,
          user_id INTEGER,
          ip TEXT,
          payload TEXT,
          timestamp TEXT DEFAULT (datetime('now'))
        );
      `);
    } catch {
      // Table already exists
    }
  }
}
