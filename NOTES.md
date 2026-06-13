# Implementation Notes — Strapi CMS

## 2025-06-13 — Project Complete

### Environment Analysis
Existing vyasta-production infra (reusable):
- PostgreSQL 16 on port 5544 (docker compose service `db`)
- SeaweedFS S3 on port 8333 (docker compose service `storage`)
- Maildev on port 1025/1080 (docker compose service `maildev`)
- Node 22-alpine base image, pnpm via corepack, Dokploy deployment

### Decisions Made (ADRs)
- **Node 22, pnpm, Strapi 5** — matching vyasta stack
- **Self-contained docker-compose** — isolated from vyasta infra (ports 5545/8334/1081/1026/6380)
- **DDD module structure** — `src/modules/{domain}/` for business logic, `src/api/` for Strapi content types
- **Multi-stage Docker build** — stage 1 build, stage 2 minimal runtime (~400 MB)
- **MCP with SSE transport** — Stdio + SSE, gated by ENABLE_MCP
- **Admin branding via code** — `src/admin/app.tsx` + SVG assets (EE-only in UI)
- **Review Workflows** — EE-only, CE uses Draft & Publish

### Phase 0 — Foundation ✅ (9 tests)
- Strapi 5.48.0 + TS, pnpm
- PostgreSQL driver + SQLite fallback for local dev
- All deps: S3, GraphQL, Sentry, MCP SDK, Express, ioredis
- Multi-stage Dockerfile + docker-compose.yml
- S3 upload (SeaweedFS), email (Maildev), CSP, CORS
- Health check routes: `/api/health/live`, `/api/health/ready`
- Docker entrypoint + bucket creation script
- Admin auto-creation via bootstrap lifecycle

### Phase 1 — Content Architecture ✅ (19 tests)
- Content types: Article, Page, Category, Tag, Navigation
- Dynamic Zones on Article (contentBlocks) and Page (layout)
- Components: SEO, Rich Text, Image Gallery, CTA, FAQ, Nav Item
- i18n on Article, Page, Category — schema-level config
- Draft & Publish on Article, Page
- Admin branding: SVG logos, favicon in `public/uploads/`

### Phase 2 — CI/CD + Security ✅ (27 tests)
- `.github/workflows/ci.yml` — lint, typecheck, test, build on PR
- `.github/workflows/deploy.yml` — build + push Docker image to GHCR on merge
- Security: CSP headers, public registration disabled
- Audit service with DB fallback to console
- Trivy-ready (CI build step), pnpm audit in CI

### Phase 3 — Cache + Monitoring ✅ (33 tests)
- Redis cache service (graceful fallback when Redis unavailable)
- Cache middleware for GET responses with TTL + invalidation
- Sentry plugin configured (DSN required)
- Webhooks configurable via admin UI

### Phase 4 — MCP v1 Read-Only ✅ (45 tests)
- MCP server bootstrap gated by `ENABLE_MCP=true`
- Tools: query_content_collection, get_collection_schema, run_system_audit
- UID allowlist validation at handler boundary
- SSE transport on port 3001 with x-mcp-secret auth
- Stdio transport for local MCP clients

### Phase 5 — MCP v2 Write Tools ✅ (54 tests)
- Tools: create_content_entry, update_content_entry, publish_entry
- `dry_run: true` mode — preview changes without persisting
- Rate limiting (60 req/min, configurable via MCP_RATE_LIMIT)
- Write tool gate (MCP_WRITE_ENABLED flag)
- Dedicated MCP replica in docker-compose with `--profile mcp`

### Issues Encountered
- `strapi-plugin-rest-cache@4.x` incompatible with Strapi 5 (Strapi 4). Removed.
- `vitest@4.x` incompatible with Strapi 5's Vite 5. Downgraded to vitest@2.x.
- Circular ref in `navigation.item` component (self-referencing children) — caused stack overflow in admin panel. Removed.
- Review Workflows is EE-only in Strapi 5. CE uses Draft & Publish built-in.

### Final Test Report
```
Test Files  10 passed (10)
     Tests  54 passed (54)
```

| Suite | Tests |
|---|---|
| Health service | 3 |
| Audit service | 3 |
| Cache service | 6 |
| Content service | 5 |
| Media service | 5 |
| MCP allowlist | 5 |
| MCP tools (read) | 7 |
| MCP tools (write) | 9 |
| Security + CI | 5 |
| Build integrity | 6 |

### How to Run

**Local dev (SQLite, no Docker):**
```bash
cd cms && pnpm develop
# Admin: http://localhost:1337/admin (admin@strapi.local / Admin123!)
```

**Full stack (self-contained Docker):**
```bash
cd cms && podman compose up -d
# Strapi: http://localhost:1337
# MCP (separate container): podman compose --profile mcp up -d
```

**Tests:**
```bash
pnpm test     # 54 tests, ~5s
pnpm build    # Admin panel build
```
