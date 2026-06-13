import { describe, it, expect, vi } from 'vitest';
import { queryContentCollection } from '../tools/query-content-collection';
import { getCollectionSchema } from '../tools/get-collection-schema';
import { runSystemAudit } from '../tools/run-system-audit';

function mockStrapi(overrides: any = {}) {
  return {
    entityService: {
      findMany: vi.fn().mockResolvedValue([{ id: 1, title: 'Test Article' }]),
    },
    contentType: vi.fn().mockReturnValue({
      uid: 'api::test.test',
      kind: 'collectionType',
      info: { displayName: 'Test' },
      attributes: { title: { type: 'string' } },
      options: {},
    }),
    db: {
      connection: {
        raw: vi.fn().mockResolvedValue([{ '1': 1 }]),
      },
    },
    config: {
      get: vi.fn().mockReturnValue('5.48.0'),
    },
    contentTypes: {
      'api::test.test': { kind: 'collectionType', info: { displayName: 'Test' } },
      'api::page.page': { kind: 'collectionType', info: { displayName: 'Page' } },
    },
    plugin: {
      'upload': { config: {} },
      'graphql': { config: {} },
    },
    ...overrides,
  } as any;
}

describe('MCP Tool: query_content_collection', () => {
  it('fetches entries with default params', async () => {
    const strapi = mockStrapi();
    const result = await queryContentCollection(
      { uid: 'api::test.test' },
      strapi
    );

    expect(strapi.entityService.findMany).toHaveBeenCalledWith(
      'api::test.test',
      expect.objectContaining({ limit: 10, start: 0 })
    );
    expect(result.content[0].type).toBe('text');
  });

  it('caps limit at 100', async () => {
    const strapi = mockStrapi();
    await queryContentCollection(
      { uid: 'api::test.test', limit: 999 },
      strapi
    );

    expect(strapi.entityService.findMany).toHaveBeenCalledWith(
      'api::test.test',
      expect.objectContaining({ limit: 100 })
    );
  });

  it('passes filters to entityService', async () => {
    const strapi = mockStrapi();
    await queryContentCollection(
      { uid: 'api::test.test', filters: { title: { $eq: 'hello' } } },
      strapi
    );

    expect(strapi.entityService.findMany).toHaveBeenCalledWith(
      'api::test.test',
      expect.objectContaining({ filters: { title: { $eq: 'hello' } } })
    );
  });
});

describe('MCP Tool: get_collection_schema', () => {
  it('returns schema for valid UID', async () => {
    const strapi = mockStrapi();
    const result = await getCollectionSchema({ uid: 'api::test.test' }, strapi);

    const text = JSON.parse(result.content[0].text);
    expect(text.uid).toBe('api::test.test');
    expect(text.attributes).toBeDefined();
  });

  it('returns error for invalid UID', async () => {
    const strapi = mockStrapi();
    strapi.contentType.mockReturnValue(null);

    const result = await getCollectionSchema({ uid: 'api::invalid.invalid' }, strapi);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});

describe('MCP Tool: run_system_audit', () => {
  it('returns system info', async () => {
    const strapi = mockStrapi();
    const result = await runSystemAudit({}, strapi);

    const text = JSON.parse(result.content[0].text);
    expect(text.strapiVersion).toBe('5.48.0');
    expect(text.database).toBe('ok');
    expect(text.contentTypes).toBeDefined();
    expect(text.contentTypes.length).toBeGreaterThan(0);
    expect(text.nodeVersion).toBeDefined();
  });

  it('reports database failure', async () => {
    const strapi = mockStrapi({
      db: {
        connection: {
          raw: vi.fn().mockRejectedValue(new Error('DB down')),
        },
      },
    });

    const result = await runSystemAudit({}, strapi);
    const text = JSON.parse(result.content[0].text);
    expect(text.database).toBe('fail');
  });
});
