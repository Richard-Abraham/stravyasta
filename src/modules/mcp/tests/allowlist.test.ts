import { describe, it, expect } from 'vitest';
import { createAllowlist } from '../allowlist';

describe('MCP Allowlist', () => {
  it('allows registered UIDs', () => {
    const allowlist = createAllowlist(['api::article.article']);
    expect(allowlist.isAllowed('api::article.article')).toBe(true);
  });

  it('rejects unregistered UIDs', () => {
    const allowlist = createAllowlist(['api::article.article']);
    expect(allowlist.isAllowed('api::secret.secret')).toBe(false);
  });

  it('uses default list when no custom list provided', () => {
    const allowlist = createAllowlist();
    expect(allowlist.isAllowed('api::article.article')).toBe(true);
    expect(allowlist.isAllowed('api::page.page')).toBe(true);
  });

  it('dynamically adds UIDs', () => {
    const allowlist = createAllowlist([]);
    expect(allowlist.isAllowed('api::custom.custom')).toBe(false);
    allowlist.add('api::custom.custom');
    expect(allowlist.isAllowed('api::custom.custom')).toBe(true);
  });

  it('returns the allowed list', () => {
    const allowlist = createAllowlist(['api::a.a', 'api::b.b']);
    const list = allowlist.getAllowed();
    expect(list).toContain('api::a.a');
    expect(list).toContain('api::b.b');
    expect(list.length).toBe(2);
  });
});
