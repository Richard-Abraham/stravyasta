import type { Core } from '@strapi/strapi';

export interface AuditEntry {
  action: string;
  resource: string;
  resourceId?: string | number;
  userId?: number;
  ip?: string;
  payload?: Record<string, any>;
  timestamp: string;
}

export function createAuditService({ strapi }: { strapi: Core.Strapi }) {
  return {
    async log(entry: Omit<AuditEntry, 'timestamp'>) {
      const fullEntry: AuditEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
      };

      try {
        await strapi.db.connection.raw(
          `INSERT INTO audit_logs (action, resource, resource_id, user_id, ip, payload, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            fullEntry.action,
            fullEntry.resource,
            fullEntry.resourceId ?? null,
            fullEntry.userId ?? null,
            fullEntry.ip ?? null,
            fullEntry.payload ? JSON.stringify(fullEntry.payload) : null,
            fullEntry.timestamp,
          ]
        );
      } catch {
        // Audit table might not exist yet — fallback to console
        console.log('[AUDIT]', JSON.stringify(fullEntry));
      }
    },

    async query(filters: { action?: string; resource?: string; limit?: number }) {
      const { action, resource, limit = 100 } = filters;
      const query = strapi.db.connection.raw.bind(strapi.db.connection);
      const conditions: string[] = [];
      const params: any[] = [];

      if (action) {
        conditions.push('action = ?');
        params.push(action);
      }
      if (resource) {
        conditions.push('resource = ?');
        params.push(resource);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await query(
        `SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT ?`,
        [...params, limit]
      );
      return rows;
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
