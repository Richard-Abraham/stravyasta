import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('S3_PUBLIC_URL'),
        rootPath: '',
        s3Options: {
          credentials: {
            accessKeyId: env('AWS_ACCESS_KEY_ID'),
            secretAccessKey: env('AWS_ACCESS_SECRET'),
          },
          region: env('AWS_REGION'),
          endpoint: env('S3_ENDPOINT'),
          forcePathStyle: true,
        },
        params: {
          Bucket: env('S3_BUCKET', 'strapi-media'),
          ACL: 'public-read',
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  'users-permissions': {
    config: {
      register: {
        enabled: false,
      },
    },
  },
  graphql: {
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      landingPage: false,
      depthLimit: 7,
      amountLimit: 100,
      apolloServer: {
        tracing: false,
        introspection: true,
      },
    },
  },
  sentry: {
    config: {
      dsn: env('SENTRY_DSN'),
      sendMetadata: true,
    },
  },
});

export default config;
