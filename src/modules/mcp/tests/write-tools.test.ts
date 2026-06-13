import { describe, it, expect, vi } from 'vitest';
import { createContentEntry } from '../tools/create-content-entry';
import { updateContentEntry } from '../tools/update-content-entry';
import { publishEntry } from '../tools/publish-entry';

function mockStrapi() {
  return {
    entityService: {
      create: vi.fn().mockResolvedValue({ id: 1, title: 'New Entry' }),
      update: vi.fn().mockResolvedValue({ id: 1, title: 'Updated', publishedAt: new Date().toISOString() }),
      findOne: vi.fn().mockResolvedValue({ id: 1, title: 'Existing', publishedAt: null }),
    },
  } as any;
}

describe('MCP Tool: create_content_entry', () => {
  it('creates entry with valid data', async () => {
    const strapi = mockStrapi();
    const result = await createContentEntry(
      { uid: 'api::article.article', data: { title: 'New' } },
      strapi
    );

    expect(strapi.entityService.create).toHaveBeenCalledWith(
      'api::article.article',
      { data: { title: 'New' } }
    );
    expect(result.content[0].type).toBe('text');
  });

  it('returns error when missing data', async () => {
    const strapi = mockStrapi();
    const result = await createContentEntry(
      { uid: 'api::article.article' },
      strapi
    );

    expect(result.isError).toBe(true);
  });

  it('dryRun returns preview without creating', async () => {
    const strapi = mockStrapi();
    const result = await createContentEntry(
      { uid: 'api::article.article', data: { title: 'New' }, dryRun: true },
      strapi
    );

    expect(strapi.entityService.create).not.toHaveBeenCalled();
    const text = JSON.parse(result.content[0].text);
    expect(text.dryRun).toBe(true);
    expect(text.wouldCreate).toBe(true);
  });
});

describe('MCP Tool: update_content_entry', () => {
  it('updates existing entry', async () => {
    const strapi = mockStrapi();
    const result = await updateContentEntry(
      { uid: 'api::article.article', id: 1, data: { title: 'Updated' } },
      strapi
    );

    expect(strapi.entityService.findOne).toHaveBeenCalledWith('api::article.article', 1);
    expect(strapi.entityService.update).toHaveBeenCalled();
    expect(result.content[0].type).toBe('text');
  });

  it('returns error when entry not found', async () => {
    const strapi = mockStrapi();
    strapi.entityService.findOne.mockResolvedValue(null);

    const result = await updateContentEntry(
      { uid: 'api::article.article', id: 999, data: { title: 'Nope' } },
      strapi
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('dryRun returns diff without updating', async () => {
    const strapi = mockStrapi();
    const result = await updateContentEntry(
      { uid: 'api::article.article', id: 1, data: { title: 'New Title' }, dryRun: true },
      strapi
    );

    expect(strapi.entityService.update).not.toHaveBeenCalled();
    const text = JSON.parse(result.content[0].text);
    expect(text.dryRun).toBe(true);
    expect(text.before).toBeDefined();
    expect(text.after).toBeDefined();
  });
});

describe('MCP Tool: publish_entry', () => {
  it('publishes entry', async () => {
    const strapi = mockStrapi();
    strapi.entityService.findOne.mockResolvedValue({ id: 1, publishedAt: null });
    strapi.entityService.update.mockResolvedValue({ id: 1, publishedAt: new Date().toISOString() });

    const result = await publishEntry(
      { uid: 'api::article.article', id: 1, publish: true },
      strapi
    );

    expect(strapi.entityService.update).toHaveBeenCalled();
    const text = JSON.parse(result.content[0].text);
    expect(text.status).toBe('published');
  });

  it('unpublishes entry', async () => {
    const strapi = mockStrapi();
    strapi.entityService.update.mockResolvedValue({ id: 1, publishedAt: null });

    const result = await publishEntry(
      { uid: 'api::article.article', id: 1, publish: false },
      strapi
    );

    const text = JSON.parse(result.content[0].text);
    expect(text.status).toBe('draft');
  });

  it('dryRun returns preview', async () => {
    const strapi = mockStrapi();
    const result = await publishEntry(
      { uid: 'api::article.article', id: 1, publish: true, dryRun: true },
      strapi
    );

    expect(strapi.entityService.update).not.toHaveBeenCalled();
    const text = JSON.parse(result.content[0].text);
    expect(text.dryRun).toBe(true);
  });
});
