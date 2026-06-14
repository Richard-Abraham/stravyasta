import { describe, it, expect, vi } from 'vitest';

function mockStrapi(entity: any = null) {
  return {
    entityService: {
      findOne: vi.fn().mockResolvedValue(entity),
    },
  } as any;
}

describe('Theme Setting Service', () => {
  it('returns null when no theme set', async () => {
    const { default: service } = await import('../services/theme-setting');
    const strapi = mockStrapi(null);
    const result = await service({ strapi }).getTheme();
    expect(result).toBeNull();
  });

  it('returns defaults for missing fields', async () => {
    const { default: service } = await import('../services/theme-setting');
    const strapi = mockStrapi({ id: 1 });
    const result = await service({ strapi }).getTheme();
    expect(result.brandName).toBe('Sattva');
    expect(result.primaryColor).toBe('#7C3AED');
    expect(result.fontFamily).toBe('Inter');
    expect(result.footerText).toBe('All rights reserved.');
  });

  it('returns saved values when set', async () => {
    const { default: service } = await import('../services/theme-setting');
    const strapi = mockStrapi({
      id: 1,
      brandName: 'MyBrand',
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      accentColor: '#0000FF',
      fontFamily: 'Roboto',
      borderRadius: 'large',
      layoutStyle: 'wide',
      footerText: 'My footer',
      logo: null,
      favicon: null,
      customCss: 'body { color: red; }',
      updatedAt: '2026-01-01',
    });
    const result = await service({ strapi }).getTheme();
    expect(result.brandName).toBe('MyBrand');
    expect(result.primaryColor).toBe('#FF0000');
    expect(result.fontFamily).toBe('Roboto');
    expect(result.customCss).toBe('body { color: red; }');
  });

  it('resolves logo URL when present', async () => {
    const { default: service } = await import('../services/theme-setting');
    process.env.S3_PUBLIC_URL = 'http://media.example.com';
    const strapi = mockStrapi({
      id: 1,
      logo: { url: '/uploads/logo.png' },
      favicon: null,
    });
    const result = await service({ strapi }).getTheme();
    expect(result.logo).toBe('http://media.example.com/uploads/logo.png');
  });
});
