import { describe, it, expect, vi } from 'vitest';
import { createCacheService } from '../services/cache.service';

function mockStrapi() {
  return {} as any;
}

describe('CacheService', () => {
  it('buildKey returns simple key without params', () => {
    const service = createCacheService({ strapi: mockStrapi() });
    expect(service.buildKey('api::article.article')).toBe('cache:api::article.article');
  });

  it('buildKey includes params when provided', () => {
    const service = createCacheService({ strapi: mockStrapi() });
    const key = service.buildKey('api::article.article', { limit: 10 });
    expect(key).toContain('cache:api::article.article');
    expect(key).toContain('limit');
  });

  it('isAvailable returns false when Redis not connected', () => {
    const service = createCacheService({ strapi: mockStrapi() });
    expect(service.isAvailable()).toBe(false);
  });

  it('get returns null when Redis unavailable', async () => {
    const service = createCacheService({ strapi: mockStrapi() });
    expect(await service.get('anything')).toBeNull();
  });

  it('set silently succeeds when Redis unavailable', async () => {
    const service = createCacheService({ strapi: mockStrapi() });
    await expect(
      service.set('key', { body: { data: 'test' }, status: 200, timestamp: Date.now() })
    ).resolves.toBeUndefined();
  });

  it('invalidate silently succeeds when Redis unavailable', async () => {
    const service = createCacheService({ strapi: mockStrapi() });
    await expect(service.invalidate('cache:api::article.*')).resolves.toBeUndefined();
  });
});
