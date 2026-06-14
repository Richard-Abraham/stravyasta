import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::newsletter-subscription.newsletter-subscription' as any,
  ({ strapi }) => ({
    async create(ctx) {
      try {
        await super.create(ctx);
      } catch (err: any) {
        // Swallow unique-constraint violations — same email re-subscribes silently
        if (err?.name !== 'ApplicationError' && err?.name !== 'YupValidationError') {
          throw err;
        }
      }
      ctx.body = { data: { message: 'subscribed' } };
    },
  })
);
