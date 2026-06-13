import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

describe('CI/CD configuration', () => {
  it('CI workflow exists', () => {
    expect(fs.existsSync(path.join(root, '.github/workflows/ci.yml'))).toBe(true);
  });

  it('Deploy workflow exists', () => {
    expect(fs.existsSync(path.join(root, '.github/workflows/deploy.yml'))).toBe(true);
  });
});

describe('Security hardening', () => {
  it('plugins.ts disables public registration', () => {
    const content = fs.readFileSync(path.join(root, 'config/plugins.ts'), 'utf-8');
    expect(content).toContain('register');
    expect(content).toContain('enabled: false');
  });

  it('middlewares include CSP', () => {
    const content = fs.readFileSync(path.join(root, 'config/middlewares.ts'), 'utf-8');
    expect(content).toContain('contentSecurityPolicy');
    expect(content).toContain('img-src');
  });

  it('.env.example does not contain real secrets', () => {
    const content = fs.readFileSync(path.join(root, '.env.example'), 'utf-8');
    expect(content).not.toContain('secret');
    expect(content).toContain('change-me');
  });
});
