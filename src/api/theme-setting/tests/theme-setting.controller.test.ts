import { describe, it, expect, vi } from 'vitest';

function mockCtx(body: any = null) {
  return { body: null };
}

describe('Theme Setting Controller', () => {
  it('returns theme data', async () => {
    const { default: controller } = await import('../controllers/theme-setting');
    const strapi = {
      service: vi.fn().mockReturnValue({
        getTheme: vi.fn().mockResolvedValue({ brandName: 'Test', primaryColor: '#000' }),
      }),
    } as any;
    const ctx = mockCtx();
    await controller({ strapi }).find(ctx);
    expect(ctx.body.data.brandName).toBe('Test');
  });

  it('returns defaults on error', async () => {
    const { default: controller } = await import('../controllers/theme-setting');
    const strapi = {
      service: vi.fn().mockReturnValue({
        getTheme: vi.fn().mockRejectedValue(new Error('DB error')),
      }),
    } as any;
    const ctx = mockCtx();
    await controller({ strapi }).find(ctx);
    expect(ctx.body.data.primaryColor).toBe('#7C3AED');
    expect(ctx.body.data.fontFamily).toBe('Inter');
  });
});
