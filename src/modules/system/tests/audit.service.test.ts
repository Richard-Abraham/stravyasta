import { describe, it, expect, vi } from 'vitest';
import { createAuditService } from '../services/audit.service';

function mockStrapi() {
  return {
    db: {
      connection: {
        raw: vi.fn(),
      },
    },
  } as any;
}

describe('AuditService', () => {
  it('log inserts audit entry into database', async () => {
    const strapi = mockStrapi();
    strapi.db.connection.raw.mockResolvedValue([{ id: 1 }]);
    const service = createAuditService({ strapi });

    await service.log({
      action: 'create',
      resource: 'article',
      resourceId: 1,
      userId: 1,
    });

    expect(strapi.db.connection.raw).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.arrayContaining(['create', 'article', 1, 1])
    );
  });

  it('log falls back to console when DB fails', async () => {
    const strapi = mockStrapi();
    strapi.db.connection.raw.mockRejectedValue(new Error('Table not found'));
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const service = createAuditService({ strapi });

    await service.log({
      action: 'update',
      resource: 'page',
      resourceId: 5,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('update')
    );
    consoleSpy.mockRestore();
  });

  it('query filters by action and resource', async () => {
    const strapi = mockStrapi();
    strapi.db.connection.raw.mockResolvedValue([{ action: 'create' }]);
    const service = createAuditService({ strapi });

    await service.query({ action: 'create', resource: 'article' });

    expect(strapi.db.connection.raw).toHaveBeenCalledWith(
      expect.stringContaining('WHERE action = ? AND resource = ?'),
      ['create', 'article', 100]
    );
  });
});
