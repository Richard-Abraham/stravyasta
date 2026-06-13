import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

describe('Phase 7 — Production Readiness', () => {
  // ── PM2 Ecosystem ──
  describe('PM2 cluster config', () => {
    it('ecosystem.config.js exists', () => {
      expect(fs.existsSync(path.join(root, 'ecosystem.config.js'))).toBe(true);
    });

    it('defines strapi-api and strapi-mcp processes', () => {
      const content = fs.readFileSync(path.join(root, 'ecosystem.config.js'), 'utf-8');
      expect(content).toContain('strapi-api');
      expect(content).toContain('strapi-mcp');
    });

    it('API uses cluster mode with max instances', () => {
      const content = fs.readFileSync(path.join(root, 'ecosystem.config.js'), 'utf-8');
      expect(content).toContain('exec_mode: \'cluster\'');
      expect(content).toContain('instances: \'max\'');
    });
  });

  // ── Webpack Config ──
  describe('Webpack environment injection', () => {
    it('admin webpack config exists', () => {
      expect(fs.existsSync(path.join(root, 'src/admin/webpack.config.ts'))).toBe(true);
    });

    it('supports STRAPI_ADMIN_BACKEND_URL injection', () => {
      const content = fs.readFileSync(path.join(root, 'src/admin/webpack.config.ts'), 'utf-8');
      expect(content).toContain('STRAPI_ADMIN_BACKEND_URL');
      expect(content).toContain('DefinePlugin');
    });
  });

  // ── Database Backup ──
  describe('Database backup script', () => {
    it('backup script exists', () => {
      expect(fs.existsSync(path.join(root, 'scripts/backup-db.sh'))).toBe(true);
    });

    it('supports PostgreSQL and SQLite', () => {
      const content = fs.readFileSync(path.join(root, 'scripts/backup-db.sh'), 'utf-8');
      expect(content).toContain('pg_dump');
      expect(content).toContain('DATABASE_CLIENT');
    });
  });

  // ── Dockerfile ──
  describe('Docker build pipeline', () => {
    it('Dockerfile has HEALTHCHECK', () => {
      const content = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf-8');
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('health/live');
    });

    it('Dockerfile uses multi-stage build', () => {
      const content = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf-8');
      expect(content).toContain('FROM node:22-alpine AS build');
      expect(content).toContain('FROM node:22-alpine AS');
    });

    it('Dockerfile has proper EXPOSE port', () => {
      const content = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf-8');
      expect(content).toContain('EXPOSE 1337');
    });
  });

  // ── CI/CD ──
  describe('CI/CD pipeline', () => {
    it('CI workflow has Trivy scan job', () => {
      const content = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf-8');
      expect(content).toContain('trivy');
      expect(content).toContain('HIGH,CRITICAL');
    });

    it('Deploy workflow exists', () => {
      expect(fs.existsSync(path.join(root, '.github/workflows/deploy.yml'))).toBe(true);
    });
  });

  // ── Security ──
  describe('Security hardening', () => {
    it('CSP headers configured in middlewares', () => {
      const content = fs.readFileSync(path.join(root, 'config/middlewares.ts'), 'utf-8');
      expect(content).toContain('contentSecurityPolicy');
    });

    it('Public registration disabled', () => {
      const content = fs.readFileSync(path.join(root, 'config/plugins.ts'), 'utf-8');
      expect(content).toContain('register');
      expect(content).toContain('enabled: false');
    });

    it('MCP rate limiting configured', () => {
      const content = fs.readFileSync(path.join(root, 'src/modules/mcp/server.ts'), 'utf-8');
      expect(content).toContain('simpleRateLimiter');
      expect(content).toContain('MCP_RATE_LIMIT');
    });
  });

  // ── Monitoring ──
  describe('Monitoring', () => {
    it('Health endpoints exist', () => {
      const content = fs.readFileSync(path.join(root, 'src/api/health/routes/health.ts'), 'utf-8');
      expect(content).toContain('/health/live');
      expect(content).toContain('/health/ready');
    });

    it('Audit service exists', () => {
      expect(fs.existsSync(path.join(root, 'src/modules/system/services/audit.service.ts'))).toBe(true);
    });

    it('Cache service exists', () => {
      expect(fs.existsSync(path.join(root, 'src/modules/system/services/cache.service.ts'))).toBe(true);
    });
  });
});
