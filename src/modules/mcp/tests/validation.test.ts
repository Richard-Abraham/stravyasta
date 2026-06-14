import { describe, it, expect } from 'vitest';
import { validateMcpInput } from '../validation';

describe('MCP Input Validation', () => {
  describe('UID validation', () => {
    it('accepts valid UID', () => {
      const result = validateMcpInput('query_content_collection', {
        uid: 'api::article.article',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects invalid UID', () => {
      const result = validateMcpInput('query_content_collection', {
        uid: 'api::secret.secret',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid uid');
    });

    it('rejects missing uid', () => {
      const result = validateMcpInput('query_content_collection', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('uid is required');
    });
  });

  describe('Write tool validation', () => {
    it('create requires data', () => {
      const result = validateMcpInput('create_content_entry', {
        uid: 'api::article.article',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('data is required');
    });

    it('create accepts valid data', () => {
      const result = validateMcpInput('create_content_entry', {
        uid: 'api::article.article',
        data: { title: 'Test' },
      });
      expect(result.valid).toBe(true);
    });

    it('update requires id and data', () => {
      const result = validateMcpInput('update_content_entry', {
        uid: 'api::article.article',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('publish requires id', () => {
      const result = validateMcpInput('publish_entry', {
        uid: 'api::article.article',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('id is required');
    });
  });

  describe('Pagination validation', () => {
    it('rejects limit > 100', () => {
      const result = validateMcpInput('query_content_collection', {
        uid: 'api::article.article',
        limit: 999,
      });
      expect(result.valid).toBe(false);
    });

    it('accepts limit within range', () => {
      const result = validateMcpInput('query_content_collection', {
        uid: 'api::article.article',
        limit: 50,
      });
      expect(result.valid).toBe(true);
    });
  });
});
