import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

describe('Build integrity', () => {
  it('config directory exists with required files', () => {
    const configDir = path.join(root, 'config');
    expect(fs.existsSync(configDir)).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'database.ts'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'server.ts'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'middlewares.ts'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'plugins.ts'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'admin.ts'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'api.ts'))).toBe(true);
  });

  it('Dockerfile exists', () => {
    expect(fs.existsSync(path.join(root, 'Dockerfile'))).toBe(true);
  });

  it('docker-compose.yml exists', () => {
    expect(fs.existsSync(path.join(root, 'docker-compose.yml'))).toBe(true);
  });

  it('package.json exists', () => {
    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
  });

  it('modules directory exists under src', () => {
    expect(fs.existsSync(path.join(root, 'src/modules'))).toBe(true);
  });

  it('system module has health service', () => {
    expect(fs.existsSync(path.join(root, 'src/modules/system/services/health.service.ts'))).toBe(true);
  });
});
