import type { Core } from '@strapi/strapi';

export function createMediaService({ strapi }: { strapi: Core.Strapi }) {
  return {
    getUploadProvider(): string {
      const provider = strapi.config.get('plugin.upload.provider') as string;
      return provider || 'local';
    },

    isProviderConfigured(): boolean {
      return this.getUploadProvider() !== 'local';
    },

    validateMimeType(mime: string, allowed: string[]): boolean {
      return allowed.some((pattern) => {
        if (pattern.endsWith('/*')) {
          return mime.startsWith(pattern.replace('/*', ''));
        }
        return mime === pattern;
      });
    },

    getMaxFileSize(): number {
      return (strapi.config.get('plugin.upload.sizeLimit') as number) || 104857600;
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
