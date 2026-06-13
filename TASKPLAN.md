# Strapi CMS — Complete Build & MCP Integration Task Plan

Reference: `docs/Strapi_Extended_Build_MCP_Guide_v2.1.docx`
Tracking: `AGENTS.md` (decisions), `NOTES.md` (log)

**Pattern:** Every phase has: Code → Test → Verify. Tests run via `pnpm test`.

---

## Phase 0 — Foundation Setup ✅ DONE

**Goal:** Strapi 5 running on PostgreSQL with S3, Redis, email, Docker, DDD structure.

### Completed

- [x] Strapi 5 + TypeScript initialized
- [x] pnpm (matching vyasta)
- [x] PostgreSQL driver + SQLite fallback for local dev
- [x] All deps: S3 upload, GraphQL, Sentry, MCP SDK, Express, ioredis
- [x] Multi-stage Dockerfile (Node 22, pnpm, stage1 build → stage2 runtime)
- [x] docker-compose.yml (PG + SeaweedFS + Maildev + Redis + Strapi)
- [x] S3 upload provider (SeaweedFS)
- [x] Email provider (Maildev dev / Resend prod)
- [x] Health check routes: `/api/health/live`, `/api/health/ready`
- [x] Security: CSP headers, CORS config
- [x] DDD structure: `src/modules/{system,content,media}`
- [x] vitest + test scripts
- [x] Foundation tests: health service (3), build integrity (6) — 9 passing
- [x] Example content types: Article, Category, Tag
- [x] SEO shared component
- [x] `.env` / `.env.example` / `.dockerignore` / `docker-entrypoint.sh`
- [x] Admin auto-creation via bootstrap lifecycle
- [x] Local `pnpm develop` verified working

### Tests: `pnpm test` → 9/9 passing

| Test | File | Count |
|---|---|---|
| Health service (liveness, readiness, degraded) | `src/modules/system/tests/health.service.test.ts` | 3 |
| Build integrity (config files, Dockerfile, compose, modules) | `src/tests/build-integrity.test.ts` | 6 |

---

## Phase 1 — Content Architecture & Admin

**Goal:** Full content model, i18n, RBAC, Review Workflows, brand customization.

### Code

- [ ] Add remaining Content Types:
  - [ ] Page (collection type, i18n, dynamic zones for layout blocks)
  - [ ] Navigation item (single type or component)
  - [ ] Media gallery (collection type with multiple image component)
- [ ] Add Components:
  - [ ] Rich text block (component, repeatable)
  - [ ] Image gallery (component, repeatable)
  - [ ] Call to action (component)
  - [ ] FAQ (component with repeatable Q&A items)
- [ ] Add Dynamic Zones:
  - [ ] Page layout zone (rich text, gallery, CTA, FAQ blocks)
  - [ ] Article content zone (rich text, image, video, quote blocks)
- [ ] Configure i18n on all localized fields
- [ ] Set up Roles & Permissions:
  - [ ] Super Admin (full access)
  - [ ] Editor (create/edit/publish all content)
  - [ ] Author (create/edit own drafts, submit for review)
  - [ ] API Consumer (read-only via tokens)
- [ ] Configure Review Workflows:
  - [ ] Draft → In Review → Approved → Published
- [ ] Customize Admin Panel:
  - [ ] Logo, favicon
  - [ ] Brand colors
  - [ ] Homepage / Dashboard customization
- [ ] Configure Webhooks for content lifecycle (create, update, publish, delete)

### Tests

- [ ] Write tests for content module service (`src/modules/content/tests/`)
  - [ ] `content.service.test.ts` — findArticles, findArticleById, findBySlug
- [ ] Write tests for media module (`src/modules/media/tests/`)
  - [ ] `media.service.test.ts` — upload validation, format detection
- [ ] Write tests for RBAC validation utils
- [ ] Write tests for custom components validation
- [ ] Verify all tests pass: `pnpm test`

### Verification

- [ ] `pnpm develop` starts without errors
- [ ] Admin panel shows branded UI
- [ ] Can create Article with all fields/relations/components
- [ ] Can create Page with dynamic zones
- [ ] i18n shows locale switcher
- [ ] Review workflow shows Draft → Review → Published states
- [ ] Editor role can publish, Author role cannot
- [ ] Webhook fires on publish

---

## Phase 2 — CI/CD & Security Hardening

**Goal:** Automated build pipeline + hardened security.

### Code

- [ ] GitHub Actions: `.github/workflows/ci.yml`
  - [ ] Lint + Typecheck on PR
  - [ ] Run `pnpm test` on PR
  - [ ] Build Docker image on merge to main
  - [ ] Push to container registry (GHCR)
- [ ] GitHub Actions: `.github/workflows/deploy.yml`
  - [ ] Deploy to Dokploy via webhook or registry
- [ ] Security:
  - [ ] Disable public registration in Users & Permissions plugin
  - [ ] Configure CSP headers (finalize directives)
  - [ ] Rate limiting at reverse proxy level (Dokploy/Nginx)
  - [ ] Container vulnerability scanning (Trivy in CI)
  - [ ] Dependency auditing (`pnpm audit` in CI)
  - [ ] Secret rotation plan (90-day for JWT, API tokens)

### Tests

- [ ] Write security config tests (`src/modules/system/tests/security.test.ts`)
  - [ ] CSP headers present in response
  - [ ] Public registration disabled
- [ ] Write CI pipeline validation test
- [ ] Verify all tests pass: `pnpm test`

### Verification

- [ ] PR triggers lint + typecheck + test
- [ ] Merge to main builds Docker image
- [ ] Trivy scan passes (no high-severity CVEs)
- [ ] Public registration returns 403

---

## Phase 3 — API Extensions & Monitoring

**Goal:** Full API surface + monitoring + Redis caching middleware.

### Code

- [ ] Redis caching middleware:
  - [ ] Custom Koa middleware for GET response caching
  - [ ] Cache invalidation on content mutations
  - [ ] Configurable TTL per content type
  - [ ] Graceful fallback when Redis is down
- [ ] Sentry integration:
  - [ ] Error capture
  - [ ] Performance tracing
- [ ] Audit logging:
  - [ ] Custom middleware logging all mutations (create, update, delete)
  - [ ] Store audit log in DB or Redis
- [ ] Webhook retry logic:
  - [ ] Retry on failure (3 attempts with backoff)
  - [ ] Dead letter queue after max retries
- [ ] Custom API documentation (Swagger/OpenAPI)
- [ ] REST API parameter fine-tuning:
  - [ ] Pagination defaults
  - [ ] Populate defaults per content type

### Tests

- [ ] Write Redis cache middleware tests
  - [ ] Cache hit returns cached data
  - [ ] Cache miss fetches and stores
  - [ ] Invalidation on content mutation
- [ ] Write audit logging tests
  - [ ] Mutation creates audit entry
- [ ] Write webhook retry tests
- [ ] Verify all tests pass: `pnpm test`

### Verification

- [ ] GET endpoints return cached responses (check headers)
- [ ] Mutation clears cache for affected content type
- [ ] Sentry captures errors in console (DSN-mode)
- [ ] Audit log shows all mutations
- [ ] Webhook retries on failure

---

## Phase 4 — MCP v1: Read-Only Tools

**Goal:** AI agents can query content and schemas through MCP.

### Code

- [ ] Implement MCP server bootstrap in `src/index.ts` with `ENABLE_MCP` gate
- [ ] Register tool manifest (`ListToolsRequestSchema`)
- [ ] Tool: `query_content_collection` — paginated fetch with filters
- [ ] Tool: `get_collection_schema` — field definitions for any UID
- [ ] Tool: `run_system_audit` — Strapi version, plugins, DB health
- [ ] UID allowlist validation at handler boundary
- [ ] Audit logging for all MCP tool calls
- [ ] MCP replica Dockerfile / docker-compose profile with `ENABLE_MCP=true`

### Tests

- [ ] Write MCP tool tests (`src/modules/mcp/tests/`)
  - [ ] `query_content_collection` returns paginated results
  - [ ] `get_collection_schema` returns attributes for valid UID
  - [ ] `get_collection_schema` returns empty for invalid UID
  - [ ] `run_system_audit` returns version + plugins + health
  - [ ] UID allowlist rejects unauthorized content types
  - [ ] Audit log records MCP call
- [ ] Write MCP bootstrap gate test
  - [ ] Server not started when `ENABLE_MCP=false`
  - [ ] Server starts when `ENABLE_MCP=true`
- [ ] Verify all tests pass: `pnpm test`

### Verification

- [ ] Connect with MCP client (Claude Desktop / Continue.dev)
- [ ] Query articles via MCP returns JSON
- [ ] Schema introspection returns field definitions
- [ ] Audit log shows MCP queries

---

## Phase 5 — MCP v2: Write Tools & SSE Transport

**Goal:** Full read-write MCP with remote SSE transport.

### Code

- [ ] Tool: `create_content_entry` — create any content entry via UID
- [ ] Tool: `update_content_entry` — update by UID + ID
- [ ] Tool: `publish_entry` — publish/draft toggle
- [ ] `dry_run: true` mode for write tools (preview changes without persisting)
- [ ] HTTP/SSE transport layer with Express
- [ ] `MCP_AUTH_SECRET` header enforcement
- [ ] Session management for SSE transports
- [ ] Rate limiting on MCP node (60 req/min starting)
- [ ] Full RBAC scoping for MCP write operations
- [ ] Document MCP tool manifest for AI orchestration teams

### Tests

- [ ] Write MCP write tool tests
  - [ ] `create_content_entry` creates entity and returns it
  - [ ] `update_content_entry` applies patch and returns updated
  - [ ] `publish_entry` toggles draft/publish status
  - [ ] `dry_run: true` does not persist changes
  - [ ] Auth header required for SSE transport
  - [ ] Unauthorized requests rejected
- [ ] Write RBAC scoping tests
  - [ ] Writer role can write allowed UIDs
  - [ ] Writer role blocked for restricted UIDs
- [ ] Verify all tests pass: `pnpm test`

### Verification

- [ ] Connect via SSE transport with auth
- [ ] Create article via MCP, verify in admin panel
- [ ] Update article via MCP, verify change persisted
- [ ] Publish/unpublish via MCP
- [ ] `dry_run` mode shows preview without persisting
- [ ] Unauthorized request returns 401
- [ ] Rate limit kicks in at 60 req/min

---

## Phase 6 — Production Readiness & Polish

**Goal:** Go-live ready with operational excellence.

### Code

- [ ] PM2 cluster config (if Dokploy doesn't manage process)
- [ ] Backup strategy: automated DB snapshots before migrations
- [ ] Disaster recovery: restore from backup procedure
- [ ] Monitoring: Grafana dashboard or Datadog integration
- [ ] Load testing: k6 or artillery scenarios
- [ ] Performance tuning: DB indexes, query optimization, cache tuning
- [ ] Go-live checklist (production env vars, secrets, domain, SSL)

### Tests

- [ ] Write PM2 config test (config file exists, valid format)
- [ ] Write backup/restore dry-run test
- [ ] Write load test scenario (k6 script)
- [ ] Final test sweep: `pnpm test` — all suites green
- [ ] Verify Docker build: `docker build .` passes
- [ ] Final admin panel build: `pnpm build` passes

### Verification

- [ ] Strapi runs under PM2 cluster or Dokploy restart
- [ ] 100 concurrent users with <500ms response time
- [ ] Cache hit ratio > 80%
- [ ] All security checklist items from guide Section 7 satisfied
- [ ] Go-live checklist reviewed and approved
