import type { Core } from '@strapi/strapi';

const PUBLIC_ACTIONS = [
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
  'api::newsletter-subscription.newsletter-subscription.create',
];

/**
 * Ensures the Users & Permissions "Public" role can access the read-only
 * content endpoints the frontend depends on, plus submit the contact form.
 * Without this, content types without `auth: false` routes
 * (page/category/tag/navigation/contact) return 403 for anonymous requests.
 */
export async function ensurePublicPermissions({ strapi }: { strapi: Core.Strapi }) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) return;

  const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: publicRole.id, action: { $in: PUBLIC_ACTIONS } },
  });
  const existingActions = new Set(existing.map((p: { action: string }) => p.action));

  const missing = PUBLIC_ACTIONS.filter((action) => !existingActions.has(action));

  await Promise.all(
    missing.map((action) =>
      strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, role: publicRole.id },
      })
    )
  );
}
