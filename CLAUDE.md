# CLAUDE.md — Stravyasta (Strapi CMS)

## Test-First Verification — Mandatory Rule

**Tests must pass 100% before any work is reported as complete.**
Run: `pnpm test` — 94 tests across 14 suites.

## Important Commands

```bash
pnpm test        # Run all tests
pnpm build       # Build admin panel
pnpm develop     # Start dev server
pnpm start       # Start production server
```

## Architecture

- Business logic in `src/modules/{domain}/services/`
- Content types in `src/api/{name}/content-types/`
- Tests in `src/modules/{domain}/tests/`
- Config in `config/`
- MCP tools in `src/modules/mcp/tools/`

## Always Follow

- Write tests before reporting any work complete
- Never commit .env or secrets
- Match existing code style and conventions
- Keep responses concise
