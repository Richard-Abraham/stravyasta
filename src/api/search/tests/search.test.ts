import { describe, it, expect, vi } from 'vitest';

function mockStrapi(searchResult: any = []) {
  return {
    db: {
      connection: {
        raw: vi.fn().mockResolvedValue(searchResult),
      },
    },
  } as any;
}

describe('Search endpoint', () => {
  it('returns empty results for blank query', async () => {
    const { default: controller } = await import('../controllers/search');
    const strapi = mockStrapi();
    const ctx: any = { query: {}, body: null };
    await controller({ strapi }).search(ctx);
    expect(ctx.body.data).toEqual([]);
  });

  it('returns results for valid query', async () => {
    const { default: controller } = await import('../controllers/search');
    const mockResults = [
      { id: 1, title: 'Test Article', slug: 'test-article', excerpt: 'A test' },
    ];
    const strapi = mockStrapi(mockResults);
    const ctx: any = { query: { q: 'test' }, body: null };
    await controller({ strapi }).search(ctx);
    expect(ctx.body.data.length).toBeGreaterThan(0);
    expect(ctx.body.meta.query).toBe('test');
  });

  it('limits results to 50 max', async () => {
    const { default: controller } = await import('../controllers/search');
    const strapi = mockStrapi([]);
    const ctx: any = { query: { q: 'test', limit: '100' }, body: null };
    await controller({ strapi }).search(ctx);
    expect(strapi.db.connection.raw).toHaveBeenCalled();
  });

  it('returns 500 on DB error', async () => {
    const { default: controller } = await import('../controllers/search');
    const strapi = mockStrapi();
    strapi.db.connection.raw.mockRejectedValue(new Error('DB error'));
    const ctx: any = { query: { q: 'test' }, body: null, status: 200 };
    await controller({ strapi }).search(ctx);
    expect(ctx.status).toBe(500);
  });
});
