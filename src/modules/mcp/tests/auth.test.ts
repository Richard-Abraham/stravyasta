import { describe, it, expect } from 'vitest';
import { createMcpAuth } from '../auth';

describe('MCP Auth', () => {
  const OLD_ENV = process.env.MCP_AUTH_SECRET;

  beforeAll(() => {
    process.env.MCP_AUTH_SECRET = 'test-secret-key-12345';
  });

  afterAll(() => {
    process.env.MCP_AUTH_SECRET = OLD_ENV;
  });

  describe('header validation', () => {
    it('accepts correct secret', () => {
      const auth = createMcpAuth();
      expect(auth.validateHeader('test-secret-key-12345')).toBe(true);
    });

    it('rejects wrong secret', () => {
      const auth = createMcpAuth();
      expect(auth.validateHeader('wrong-secret')).toBe(false);
    });

    it('rejects missing header', () => {
      const auth = createMcpAuth();
      expect(auth.validateHeader(undefined)).toBe(false);
    });
  });

  describe('HMAC validation', () => {
    it('validates correct HMAC', () => {
      const auth = createMcpAuth();
      const now = Math.floor(Date.now() / 1000);
      const body = '{"test":"data"}';

      // Generate HMAC the same way the server would
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-secret-key-12345')
        .update(`${now}.${body}`)
        .digest('hex');

      expect(auth.validateHmac(String(now), signature, body)).toBe(true);
    });

    it('rejects expired timestamp (>60s)', () => {
      const auth = createMcpAuth();
      const old = Math.floor(Date.now() / 1000) - 120;
      expect(auth.validateHmac(String(old), 'any-signature', '{}')).toBe(false);
    });

    it('rejects invalid signature', () => {
      const auth = createMcpAuth();
      const now = Math.floor(Date.now() / 1000);
      expect(auth.validateHmac(String(now), 'invalid-signature', '{}')).toBe(false);
    });
  });
});
