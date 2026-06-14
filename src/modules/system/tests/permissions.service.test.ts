import { describe, it, expect, vi } from 'vitest';
import { ensurePublicPermissions } from '../services/permissions.service';

function mockStrapi({ existingActions = [] as string[], publicRole = { id: 1, type: 'public' } } = {}) {
  const create = vi.fn().mockResolvedValue(undefined);
  const findMany = vi.fn().mockResolvedValue(existingActions.map((action) => ({ action })));
  const findOne = vi.fn().mockResolvedValue(publicRole);

  return {
    strapi: {
      db: {
        query: (uid: string) => {
          if (uid === 'plugin::users-permissions.role') {
            return { findOne };
          }
          return { findMany, create };
        },
      },
    } as any,
    create,
    findMany,
    findOne,
  };
}

describe('PermissionsService', () => {
  it('creates permissions for all expected actions when none exist', async () => {
    const { strapi, create } = mockStrapi();

    await ensurePublicPermissions({ strapi });

    expect(create).toHaveBeenCalledWith({
      data: { action: 'api::page.page.find', role: 1 },
    });
    expect(create).toHaveBeenCalledWith({
      data: { action: 'api::category.category.findOne', role: 1 },
    });
    expect(create).toHaveBeenCalledWith({
      data: { action: 'api::contact.contact.create', role: 1 },
    });
    expect(create.mock.calls.length).toBeGreaterThan(5);
  });

  it('skips actions that are already enabled', async () => {
    const { strapi, create } = mockStrapi({
      existingActions: [
        'api::article.article.find',
        'api::article.article.findOne',
        'api::article.article.findBySlug',
        'api::page.page.find',
        'api::page.page.findOne',
        'api::category.category.find',
        'api::category.category.findOne',
        'api::tag.tag.find',
        'api::tag.tag.findOne',
        'api::navigation.navigation.find',
        'api::search.search.search',
        'api::contact.contact.create',
      ],
    });

    await ensurePublicPermissions({ strapi });

    expect(create).not.toHaveBeenCalled();
  });

  it('does nothing when public role does not exist', async () => {
    const { strapi, create, findMany } = mockStrapi({ publicRole: null });

    await ensurePublicPermissions({ strapi });

    expect(findMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
