# Strapi CMS — Production Build & MCP Integration

## Architecture Overview

Production-grade Strapi 5 CMS deployed on Dokploy (Docker), integrated with
existing Vyasta infrastructure:
- **PostgreSQL 16** — new `strapi` database, same cluster (host port 5544)
- **SeaweedFS** — S3-compatible storage for media (host port 8333)
- **Maildev** — SMTP email capture for dev (host port 1025)
- **Redis** — REST cache layer and MCP session coordination

Two isolated compute roles:
1. **strapi-api** — public-facing REST/GraphQL API (multi-instance)
2. **strapi-mcp** — MCP server for LLM agent access (single-instance, Stdio/SSE)

## Node & Package Manager

- **Node 22 LTS** (matching vyasta-production)
- **pnpm** via corepack (matching vyasta-production's `packageManager` field)
- **Strapi 5** with TypeScript (`create-strapi-app@latest --typescript`)

## DDD Module Structure

Business logic lives in `src/modules/{domain}/` — separate from Strapi's content
type API layer (`src/api/`). This keeps domain logic testable, framework-agnostic,
and scalable across multiple content types.

```
src/modules/          ← Pure business logic (no Strapi coupling)
  system/             ← Health, audit, config
  content/            ← Content operations
  media/              ← Media operations
src/api/              ← Strapi content types + thin delegates
  article/            ← Content type + delegates to content module
  category/
  tag/
  health/             ← Delegates to system module
```

## Testing

- vitest 2.x (compatible with Strapi 5's Vite 5)
- Test pattern: `src/modules/{domain}/tests/*.test.ts`
- Foundation tests: health service (3), build integrity (6)
- Run: `pnpm test`

## Key Decisions (ADRs)

### ADR-001: Reuse existing PostgreSQL + SeaweedFS
Don't provision new infra. Strapi gets its own database `strapi` and bucket
`strapi-media` in the existing services. Simplifies docker-compose management.

### ADR-002: Dedicated MCP replica (ENABLE_MCP gate)
Follow the doc's ADR-002: MCP runs on a separate container with `ENABLE_MCP=true`.
Prevents AI tool calls from competing with API traffic.

### ADR-003: Multi-stage Docker build
Stage 1 (build) compiles admin panel. Stage 2 (runtime) is minimal (~400 MB vs
1.2+ GB single-stage). Match vyasta's multi-stage pattern.

### ADR-004: Strapi 5 over Strapi 4
The doc references Node 18 (Strapi 4 era). We use Strapi 5 with Node 22 for
compatibility with the existing vyasta stack. Review workflow, D&P, and
TypeScript-first are built-in.

### ADR-005: HTTP/SSE transport for MCP (not Stdio)
Stdio is simpler for first deploy, but the doc's Phase 4 SSE architecture is
the end state. We'll implement SSE from the start since Dokploy handles port
mapping trivially and the vyasta team needs remote agent access.

## Phase Status

See `NOTES.md` for per-step implementation log.
See timeline in `README.md` or root planning docs.

## Strapi Feature Checklist (no gaps)

- [x] TypeScript project
- [x] PostgreSQL database
- [x] S3 media upload (SeaweedFS)
- [x] Email provider (Maildev → Resend/SMTP)
- [x] Article, Category, Tag content types (starter schemas)
- [x] SEO component created
- [x] Page content type + Navigation single type
- [x] Components: Rich Text, Image Gallery, CTA, FAQ, Nav Item
- [x] Dynamic Zones on Article (contentBlocks) and Page (layout)
- [x] Internationalization (i18n) on Article, Page, Category
- [ ] Roles & Permissions (RBAC) — requires admin panel config
- [ ] Users & Permissions plugin
- [ ] Review Workflows — EE-only in Strapi 5. CE uses Draft & Publish built-in.
  See `NOTES.md` for alternatives.
- [x] REST API + parameters
- [x] GraphQL plugin
- [x] REST Cache middleware (Redis, with graceful fallback)
- [x] Webhooks (configurable via admin UI)
- [x] Admin Panel customization
- [x] Custom API endpoints (health, etc.)
- [x] Multi-stage Docker build
- [x] Docker Compose integration
- [x] Security hardening (helmet, rate limit, CSP)
- [x] CI/CD (GitHub Actions workflows created)
- [x] MCP v1: read-only tools (query, schema, audit)
- [x] MCP v2: write tools + SSE transport ready (gated by ENABLE_MCP)
- [x] Monitoring (Sentry configured)
- [x] Audit logging (service + tests)
- [x] Error tracking (Sentry plugin)
- [ ] PM2 cluster (if not using Dokploy restart)
