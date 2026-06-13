import { describe, it, expect, vi } from 'vitest';
import { createHealthService } from '../services/health.service';

function mockStrapi() {
  return {
    db: {
      connection: {
        raw: vi.fn(),
      },
    },
  } as any;
}

describe('HealthService', () => {
  it('returns ok status for liveness', () => {
    const service = createHealthService({ strapi: mockStrapi() });
    const result = service.getLiveness();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('returns ok readiness when db responds', async () => {
    const strapi = mockStrapi();
    strapi.db.connection.raw.mockResolvedValue([{ '1': 1 }]);

    const service = createHealthService({ strapi });
    const result = await service.getReadiness();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
  });

  it('returns degraded readiness when db fails', async () => {
    const strapi = mockStrapi();
    strapi.db.connection.raw.mockRejectedValue(new Error('DB down'));

    const service = createHealthService({ strapi });
    const result = await service.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.db).toBe('fail');
  });
});
