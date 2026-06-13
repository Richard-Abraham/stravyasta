import { describe, it, expect, vi } from 'vitest';
import { createContentService } from '../services/content.service';

function mockStrapi() {
  return {
    entityService: {
      findMany: vi.fn(),
      findOne: vi.fn(),
    },
  } as any;
}

describe('ContentService', () => {
  it('findArticles calls entityService with defaults', async () => {
    const strapi = mockStrapi();
    strapi.entityService.findMany.mockResolvedValue([]);
    const service = createContentService({ strapi });

    await service.findArticles({});

    expect(strapi.entityService.findMany).toHaveBeenCalledWith(
      'api::article.article',
      expect.objectContaining({ limit: 10, start: 0 })
    );
  });

  it('findArticles passes custom limit and filters', async () => {
    const strapi = mockStrapi();
    strapi.entityService.findMany.mockResolvedValue([]);
    const service = createContentService({ strapi });

    await service.findArticles({ limit: 5, filters: { title: 'test' } });

    expect(strapi.entityService.findMany).toHaveBeenCalledWith(
      'api::article.article',
      expect.objectContaining({ limit: 5, filters: { title: 'test' } })
    );
  });

  it('findArticleById returns entity', async () => {
    const strapi = mockStrapi();
    const mockArticle = { id: 1, title: 'Test' };
    strapi.entityService.findOne.mockResolvedValue(mockArticle);
    const service = createContentService({ strapi });

    const result = await service.findArticleById(1);

    expect(result).toEqual(mockArticle);
    expect(strapi.entityService.findOne).toHaveBeenCalledWith(
      'api::article.article', 1, expect.objectContaining({ populate: '*' })
    );
  });

  it('findBySlug returns article or null', async () => {
    const strapi = mockStrapi();
    strapi.entityService.findMany.mockResolvedValue([{ id: 1, slug: 'hello' }]);
    const service = createContentService({ strapi });

    const result = await service.findBySlug('hello');

    expect(result).toEqual({ id: 1, slug: 'hello' });
  });

  it('findBySlug returns null when not found', async () => {
    const strapi = mockStrapi();
    strapi.entityService.findMany.mockResolvedValue([]);
    const service = createContentService({ strapi });

    const result = await service.findBySlug('nonexistent');

    expect(result).toBeNull();
  });
});
