import { describe, it, expect, vi } from 'vitest';
import { createMediaService } from '../index';

function mockStrapi(config: Record<string, any> = {}) {
  return {
    config: {
      get: vi.fn((key: string) => {
        const map: Record<string, any> = {
          'plugin.upload.provider': 'local',
          'plugin.upload.sizeLimit': 104857600,
          ...config,
        };
        return map[key];
      }),
    },
  } as any;
}

describe('MediaService', () => {
  it('default provider is local', () => {
    const service = createMediaService({ strapi: mockStrapi() });
    expect(service.getUploadProvider()).toBe('local');
  });

  it('detects S3 provider as configured', () => {
    const strapi = mockStrapi({ 'plugin.upload.provider': 'aws-s3' });
    const service = createMediaService({ strapi });
    expect(service.getUploadProvider()).toBe('aws-s3');
    expect(service.isProviderConfigured()).toBe(true);
  });

  it('validates mime types with wildcard', () => {
    const service = createMediaService({ strapi: mockStrapi() });
    expect(service.validateMimeType('image/jpeg', ['image/*'])).toBe(true);
    expect(service.validateMimeType('video/mp4', ['image/*'])).toBe(false);
  });

  it('validates mime types exact match', () => {
    const service = createMediaService({ strapi: mockStrapi() });
    expect(service.validateMimeType('image/jpeg', ['image/jpeg'])).toBe(true);
    expect(service.validateMimeType('image/png', ['image/jpeg'])).toBe(false);
  });

  it('returns default max file size', () => {
    const service = createMediaService({ strapi: mockStrapi() });
    expect(service.getMaxFileSize()).toBe(104857600);
  });
});
