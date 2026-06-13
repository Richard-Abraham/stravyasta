const DEFAULT_ALLOWLIST = [
  'api::article.article',
  'api::page.page',
  'api::category.category',
  'api::tag.tag',
  'api::navigation.navigation',
];

export function createAllowlist(customAllowlist?: string[]) {
  const allowed = customAllowlist && customAllowlist.length > 0
    ? customAllowlist
    : DEFAULT_ALLOWLIST;

  return {
    isAllowed(uid: string): boolean {
      return allowed.includes(uid);
    },

    getAllowed(): string[] {
      return [...allowed];
    },

    add(uid: string): void {
      if (!allowed.includes(uid)) {
        allowed.push(uid);
      }
    },
  };
}

export type Allowlist = ReturnType<typeof createAllowlist>;
