import { mergeConfig, type UserConfig } from 'vite';

export default (config: UserConfig) => {
  return mergeConfig(config, {
    server: {
      allowedHosts: [
        '.ngrok-free.dev',
        'localhost',
        '127.0.0.1',
      ],
    },
  });
};
