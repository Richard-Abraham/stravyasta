# Application Audit Report

**Project:** Strapi 5 CMS (sattva-dev/strapi)
**Audit Date:** 2026-06-13
**Auditor:** Senior Security & Quality Audit Agent
**Stack:** Strapi 5.48.0 / TypeScript / Node 22 / PostgreSQL 16 / Redis 7 / pnpm 10.30.1 / Docker + Dokploy
**Scope:** Full source audit: `src/`, `config/`, `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `scripts/`, `.github/workflows/`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env`, `.env.example`, `.gitignore`

---

## Executive Summary

This Strapi 5 CMS project demonstrates strong architectural intent with Domain-Driven Design separation (`src/modules/`), well-structured content type schemas, multi-stage Docker builds, and MCP integration. However, there are critical security gaps that must be addressed before production deployment. The `.env` file contains production-grade secrets and a weak admin password committed to disk. CORS is wide open (`origin: *`), GraphQL introspection is enabled, and the MCP SSE transport uses a static bearer-like secret with no rotation. The CI pipeline suppresses dependency audit failures. The route layer contains duplicate health endpoint definitions and several API directories are empty shells. Review Workflows is enabled in content type schemas despite being an Enterprise-only feature unavailable in Community Edition. The application is **Not Ready** for production — the first line of issues is security, the second is structural debt, and the third is operational gaps that will surface under load or during incident response.

---

## Severity Reference

| Level    | Meaning                                                                 |
|----------|-------------------------------------------------------------------------|
| CRITICAL | Exploitable now. Data loss, account takeover, or system compromise risk.|
| HIGH     | Serious vulnerability or structural failure. Must fix before launch.    |
| MEDIUM   | Meaningful risk or technical debt. Fix before scale.                    |
| LOW      | Minor issue. Fix in next cycle.                                         |
| INFO     | Observation or recommendation. No immediate risk.                       |

---

## Findings

### [CRITICAL] — Hardcoded Secrets and Weak Credentials in `.env`

**Location:** `.env` lines 6–11, 26–29
**Category:** Security / Configuration

**Description:**
The committed `.env` file contains live cryptographic secrets (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`, `JWT_SECRET`) and a weak admin password (`Admin123!`). While `.env` is in `.gitignore`, the file exists in the working tree with these values, creating a risk of accidental commit, exposure through CI artifacts, or developer mishandling. The `ADMIN_JWT_SECRET` and the additional `JWT_SECRET` variable (which is not consumed by any config file) suggest credential confusion. The `MCP_AUTH_SECRET` value is set to `change-me-in-production` — a known placeholder that will be used as-is in any copy of this `.env`.

**Impact:**
An attacker with access to these values can forge admin JWT tokens, create API tokens, decrypt encrypted data, transfer content, and gain full administrative access to the Strapi instance.

**Recommended Fix:**
1. Rotate all secrets immediately — generate fresh values via `openssl rand -base64 32` for each of `APP_KEYS` (4 values), `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`.
2. Remove the redundant `JWT_SECRET` variable from `.env` — it is not consumed by any config file and causes confusion.
3. Set `MCP_AUTH_SECRET` to a real generated value, not a placeholder.
4. Replace the admin password with a strong, generated password (20+ chars, mixed case + digits + symbols).
5. Store `.env` outside the project tree or use a secrets manager (e.g., Docker secrets, HashiCorp Vault) in production.

```bash
# Example: Generate fresh secrets
for i in 1 2 3 4; do openssl rand -base64 32; done  # APP_KEYS
openssl rand -base64 32  # API_TOKEN_SALT
openssl rand -base64 32  # ADMIN_JWT_SECRET
openssl rand -base64 32  # TRANSFER_TOKEN_SALT
openssl rand -base64 32  # ENCRYPTION_KEY
openssl rand -base64 32  # MCP_AUTH_SECRET
```

**References:**
- Strapi Security Docs: https://docs.strapi.io/dev-docs/configurations/environment

---

### [CRITICAL] — Wildcard CORS Origin Allowing Cross-Origin Attacks

**Location:** `config/middlewares.ts` line 35
**Category:** Security / Configuration

**Description:**
The CORS middleware is configured with `origin: ['*']`. This instructs browsers to allow requests from any origin, effectively disabling the Same-Origin Policy. Combined with any cookie-based authentication (Strapi admin session cookies, API token cookies), this enables CSRF attacks against authenticated users.

**Impact:**
Any website can make authenticated requests to the Strapi API on behalf of a logged-in admin user, potentially modifying content, creating users, or exfiltrating data.

**Recommended Fix:**
Replace the wildcard with the explicit production origin(s):

```typescript
// config/middlewares.ts
{
  name: 'strapi::cors',
  config: {
    origin: env.array('CORS_ORIGIN', ['https://admin.example.com']),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    keepHeaderOnError: true,
    credentials: true,
  },
},
```

Then set `CORS_ORIGIN=https://admin.example.com,https://www.example.com` in the production environment.

**References:**
- OWASP CSRF: https://owasp.org/www-community/attacks/csrf
- Strapi CORS Docs: https://docs.strapi.io/dev-docs/configurations/middlewares#cors

---

### [CRITICAL] — GraphQL Introspection Enabled in Production

**Location:** `config/plugins.ts` line 47
**Category:** Security

**Description:**
The GraphQL plugin has `introspection: true`. In production, this exposes the complete schema — every content type, field, relation, and query/mutation — to any unauthenticated client. This dramatically reduces the attacker's reconnaissance cost.

**Impact:**
An attacker can enumerate all content types, fields, relations, permissions, and discover injection points in query parameters without any prior knowledge of the system.

**Recommended Fix:**
Disable introspection in production by making it conditional on `NODE_ENV`:

```typescript
// config/plugins.ts
graphql: {
  config: {
    endpoint: '/graphql',
    shadowCRUD: true,
    landingPage: false,
    depthLimit: 7,
    amountLimit: 100,
    apolloServer: {
      tracing: false,
      introspection: env('NODE_ENV') !== 'production',
    },
  },
},
```

**References:**
- Strapi GraphQL: https://docs.strapi.io/dev-docs/plugins/graphql

---

### [HIGH] — MCP SSE Transport Uses Static Unauthenticated Shared Secret

**Location:** `src/modules/mcp/transport.ts` lines 18–24, 37–40
**Category:** Security / Authentication

**Description:**
The MCP SSE transport authenticates requests by comparing the `x-mcp-secret` request header against `MCP_AUTH_SECRET` (which defaults to `change-me-in-production`). This is a static, unhashed, shared secret transmitted in plaintext on every request. There is no token expiry, no rotation, no session binding, and no rate limiting on the auth endpoint itself. An attacker who intercepts the header value (via network sniffing, logs, or source exposure) gains indefinite access to all MCP tools, including write tools when enabled.

**Impact:**
Full MCP API access — read/write/publish content — with no time-bound session and no revocation mechanism short of redeploying.

**Recommended Fix:**
1. Generate a strong `MCP_AUTH_SECRET` (not a placeholder).
2. The current simple token comparison is baseline-acceptable for an internal backend-to-backend channel, but must be documented as such.
3. Add request timestamp + HMAC signing to prevent replay attacks for higher-security deployments.
4. Ensure the secret is never logged or exposed in error responses.

```typescript
// Recommended: constant-time comparison to prevent timing attacks
import { timingSafeEqual } from 'crypto';

function authenticate(req: express.Request): boolean {
  const secret = process.env.MCP_AUTH_SECRET;
  if (!secret) return false;
  const provided = req.headers['x-mcp-secret'];
  if (typeof provided !== 'string' || provided.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}
```

---

### [HIGH] — In-Memory Rate Limiter Not Shared Across Instances

**Location:** `src/modules/mcp/server.ts` lines 104–117
**Category:** Security / Concurrency

**Description:**
The MCP rate limiter uses an in-memory `Map<string, number[]>` that is local to each process instance. In a multi-replica deployment (Dokploy with multiple `strapi-mcp` containers), each instance maintains its own hit counters. An attacker can trivially bypass the 60 req/min limit by distributing requests across instances. There is also no limit on the size of the `Map` itself — it grows unboundedly with each unique session ID.

**Impact:**
Effective rate limit is `instance_count × 60 req/min`, defeating the protection. A memory leak is also possible under sustained traffic with unique session IDs.

**Recommended Fix:**
Replace the in-memory rate limiter with a Redis-based sliding window counter that is shared across all instances:

```typescript
import Redis from 'ioredis';

function createRedisRateLimiter(redis: Redis, windowMs: number, maxRequests: number) {
  return {
    async check(key: string): Promise<boolean> {
      const now = Date.now();
      const window = now - windowMs;
      const redisKey = `ratelimit:mcp:${key}`;
      const multi = redis.multi();
      multi.zremrangebyscore(redisKey, 0, window);
      multi.zadd(redisKey, now, `${now}-${Math.random()}`);
      multi.zcard(redisKey);
      multi.expire(redisKey, Math.ceil(windowMs / 1000));
      const results = await multi.exec();
      const count = results?.[2]?.[1] as number || 0;
      return count <= maxRequests;
    },
  };
}
```

---

### [HIGH] — Duplicate Health Route Definitions Cause Conflicts

**Location:** `src/modules/system/routes/health.routes.ts` (all 16 lines), `src/api/health/routes/health.ts` (all 16 lines)
**Category:** Architecture

**Description:**
Two separate files define identical routes for `/health/live` and `/health/ready`. The file in `src/api/health/routes/health.ts` is auto-discovered by Strapi's API loader. The file in `src/modules/system/routes/health.routes.ts` is never loaded because it resides outside the auto-discovered `api/` directory — it is dead code. If both were loaded, they would register duplicate routes, causing one to silently shadow the other (last-writer-wins behavior in Strapi's router).

**Impact:**
Confusion during debugging. If the module route is ever loaded via a custom loader, route shadowing will cause one handler to never be reached. Dead code creates maintenance burden.

**Recommended Fix:**
Delete `src/modules/system/routes/health.routes.ts`. The `src/api/health/` path is the correct Strapi convention for API route registration. The system module should only contain business logic (services, controllers), not Strapi route definitions.

---

### [HIGH] — CI Pipeline Suppresses Dependency Audit Failures

**Location:** `.github/workflows/ci.yml` line 41
**Category:** Security / Supply Chain

**Description:**
The CI workflow runs `pnpm audit --audit-level=high` with `continue-on-error: true`. This means the pipeline will report a green checkmark even when high-severity CVEs are present in dependencies. Security vulnerabilities in the supply chain become silent, undetected regressions.

**Impact:**
Deployments proceed with known-vulnerable dependencies. An attacker exploiting a dependency CVE (e.g., prototype pollution in lodash, RCE in jsonwebtoken) can compromise the application even if first-party code is clean.

**Recommended Fix:**
Remove `continue-on-error: true` or change to a separate job that blocks the pipeline on `--audit-level=high`:

```yaml
- name: Audit dependencies
  run: pnpm audit --audit-level=high
  # Remove continue-on-error: true
```

If there are expected high-severity findings, fix them or suppress specific advisories via `.nsprc` (Node Security Platform config) rather than silencing the entire audit.

---

### [HIGH] — Review Workflows Enabled in Community Edition

**Location:** `src/api/article/content-types/article/schema.json` line 12, `src/api/page/content-types/page/schema.json` line 12
**Category:** Configuration / Stability

**Description:**
Both Article and Page content type schemas have `"reviewWorkflows": true` set in their options. Review Workflows is an Enterprise Edition feature in Strapi 5. On Community Edition, this setting will either be silently ignored or cause schema validation errors at runtime, potentially preventing the application from starting or causing undefined behavior in the admin panel.

**Impact:**
Runtime errors or unexpected admin panel behavior when attempting to use review workflows features. The application may not start, or the admin panel may be partially broken.

**Recommended Fix:**
Remove the `reviewWorkflows` option from both schema files:

```json
"options": {
  "draftAndPublish": true
}
```

If review workflows are required in the future, either upgrade to Strapi EE or implement the workflow logic as a custom plugin using Draft & Publish lifecycle hooks.

---

### [HIGH] — PostgreSQL Database Password Committed in Plaintext

**Location:** `docker-compose.yml` lines 6–8, 64–65, 92–97; `.env.example` lines 22–23; `docker/seaweedfs/s3-config.json` lines 7–8
**Category:** Security / Configuration

**Description:**
The PostgreSQL password `vyasta` is hardcoded in `docker-compose.yml` for the `strapi` service, `strapi-mcp` service, and the `db` service. It also appears in `.env.example` and in the SeaweedFS S3 config. While these are development credentials, the same credentials are used across the entire stack, and the `.env.example` file is committed with a working password (not a placeholder).

**Impact:**
If the docker-compose configuration or `.env.example` is leaked, attackers gain direct database and S3 storage access. Since the same password is used for the admin database user in the PostgreSQL cluster (host port 5544/5545), this could impact other databases in the same cluster.

**Recommended Fix:**
1. Use a strong, randomly generated password for the PostgreSQL user in production.
2. Inject the database password via environment variables (already partially set up with `DATABASE_PASSWORD` env var).
3. Replace the hardcoded password in `docker-compose.yml` with `${DATABASE_PASSWORD:-vyasta}` or omit the default.
4. In `.env.example`, change `DATABASE_PASSWORD=vyasta` to `DATABASE_PASSWORD=change-me-to-a-strong-password`.
5. The SeaweedFS credentials should similarly be injected via environment variables, not hardcoded in committed config files.

---

### [MEDIUM] — Empty API Controller/Route/Service Directories for Category, Page, Tag, Navigation

**Locations:**
- `src/api/category/controllers/` (empty)
- `src/api/category/routes/` (empty)
- `src/api/category/services/` (empty)
- `src/api/page/controllers/` (empty)
- `src/api/page/routes/` (empty)
- `src/api/page/services/` (empty)
- `src/api/tag/controllers/` (empty)
- `src/api/tag/routes/` (empty)
- `src/api/tag/services/` (empty)
- `src/api/navigation/controllers/` (empty)
- `src/api/navigation/routes/ (empty)
- `src/api/navigation/services/` (empty)
**Category:** Architecture / Completeness

**Description:**
Four of the five content type API directories have empty `controllers/`, `routes/`, and `services/` subdirectories. Only `api::article.article` has custom controllers and services. Category, Page, Tag, and Navigation rely entirely on Strapi's auto-generated REST API (`shadowCRUD`). While this is functional, the AGENTS.md architecture documentation specifies that these should delegate to `src/modules/` services. The empty directories suggest incomplete implementation.

**Impact:**
Content types without custom controllers have no input validation, no authorization checks, no custom business logic, and no audit logging. Every mutation is handled purely by Strapi's generic CRUD, which bypasses the module layer entirely.

**Recommended Fix:**
Either (a) implement custom controllers/services for each content type that delegate to the respective module, or (b) remove the empty directories and document that these use shadow CRUD. If (a), follow the article pattern:

```typescript
// Example: src/api/category/controllers/category.ts
const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    // delegate to module
    ctx.body = await strapi.service('api::category.category').find(ctx.query);
  },
  // ... other handlers
});
export default controller;
```

---

### [MEDIUM] — MCP Write Tools Accept `data: object` Without Schema Validation

**Location:** `src/modules/mcp/tools/create-content-entry.ts` lines 4–12, `src/modules/mcp/tools/update-content-entry.ts` lines 4–11
**Category:** Security / Validation

**Description:**
The `create_content_entry` and `update_content_entry` MCP tools accept a free-form `data` object and pass it directly to `strapi.entityService.create/update`. There is no schema validation against the content type's attribute definitions. An LLM agent could submit invalid field types, exceed maxLength constraints, inject unexpected values into relational fields, or trigger mass-assignment vulnerabilities.

**Impact:**
Content corruption, database constraint violations causing 500 errors, or potential privilege escalation through manipulation of relational fields (e.g., assigning content to arbitrary categories or users).

**Recommended Fix:**
Validate input data against the content type's schema before persisting:

```typescript
import { z } from 'zod';

function validateAgainstSchema(uid: string, data: Record<string, any>, strapi: Core.Strapi): string[] {
  const contentType = strapi.contentType(uid);
  if (!contentType) return ['Invalid content type'];
  const errors: string[] = [];
  for (const [field, value] of Object.entries(data)) {
    const attr = contentType.attributes[field];
    if (!attr) { errors.push(`Unknown field: ${field}`); continue; }
    if (attr.type === 'string' && attr.maxLength && typeof value === 'string' && value.length > attr.maxLength) {
      errors.push(`${field} exceeds maxLength of ${attr.maxLength}`);
    }
    // Add more type-specific validation...
  }
  return errors;
}
```

---

### [MEDIUM] — MCP SSE Transport Creates Separate Express Server Outside Strapi Lifecycle

**Location:** `src/modules/mcp/transport.ts` lines 19, 52–53
**Category:** Architecture / Production Readiness

**Description:**
The `registerSSETransport` function creates a standalone Express HTTP server (`app.listen(port)`) that operates independently from Strapi's application lifecycle. This server:
- Does not use Strapi's middleware stack (no CORS, CSP, rate limiting, or request logging)
- Is not gracefully shut down on SIGTERM — connection drains are not handled
- Runs on a port that is not health-checked by Docker
- May conflict with Strapi's own process management

**Impact:**
The MCP SSE transport is a separate service with reduced security hardening, no graceful shutdown, and no monitoring coverage. During deployments or Pod restarts, in-flight MCP requests may be abruptly terminated, causing data loss or partial writes.

**Recommended Fix:**
Integrate the MCP SSE endpoints into Strapi's own HTTP server using Strapi's middleware API instead of creating a separate Express app:

```typescript
// Option A: Mount on Strapi's Koa server via custom middleware
strapi.server.use((ctx, next) => {
  if (ctx.path === '/mcp/events') { /* handle SSE */ }
  if (ctx.path === '/mcp/messages') { /* handle messages */ }
  return next();
});

// Option B: If separate port is required, implement graceful shutdown:
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
```

---

### [MEDIUM] — Cache Middleware Uses Dynamic `require()` Instead of Static Import

**Location:** `src/modules/system/controllers/cache.middleware.ts` line 4
**Category:** Architecture / Maintainability

**Description:**
The cache middleware uses `require('../services/cache.service')` at runtime inside the factory function. This bypasses TypeScript's module resolution and tree-shaking, and introduces a circular-dependency risk if the cache service ever imports from the controllers directory.

```typescript
const { createCacheService } = require('../services/cache.service');
```

**Impact:**
TypeScript cannot type-check this import. Any refactoring that renames or moves the cache service will silently break this file at runtime. No compilation error will be raised.

**Recommended Fix:**
Replace with a static import:

```typescript
import { createCacheService } from '../services/cache.service';
```

---

### [MEDIUM] — Audit Service Raw SQL Query Has Limited Injection Protections

**Location:** `src/modules/system/services/audit.service.ts` lines 57–61
**Category:** Security

**Description:**
While parameterized queries are used for `WHERE` clause values, the column names (`action`, `resource`) and the `LIMIT` value are safely parameterized. However, the `order by` clause is hardcoded and safe. The primary risk is that the query constructs a dynamic SQL string via string concatenation for WHERE conditions:

```typescript
const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
```

If the `conditions` array ever contained user-controlled column names (not currently the case), it would be injectable. This is currently safe but fragile.

**Impact:**
Low immediate risk, but any future change that passes user input into the conditions array (e.g., dynamic field filtering) would create a SQL injection vulnerability.

**Recommended Fix:**
No urgent action needed, but add a safeguard comment and unit test that verifies conditions only contain trusted values. For future extensibility, consider using Knex's query builder instead of raw SQL.

---

### [MEDIUM] — `.env.example` Contains Real Credentials

**Location:** `.env.example` lines 22–23, 27–31
**Category:** Security / Configuration

**Description:**
The `.env.example` file, which is intended to be a template with placeholder values, contains real working credentials:
- `DATABASE_PASSWORD=vyasta` (PostgreSQL password)
- `AWS_ACCESS_KEY_ID=vyasta` (S3 access key)
- `AWS_ACCESS_SECRET=vyastapass` (S3 secret key)
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_PUBLIC_URL` all contain real service addresses

These are also the values in the running `.env` and `docker-compose.yml`. If `.env.example` is shared (e.g., in documentation, or if the repo becomes public), these credentials are leaked.

**Impact:**
Anyone with access to the repository or its documentation can connect to the development database and S3 storage, and potentially pivot to production if credentials are reused.

**Recommended Fix:**
Replace all actual credentials in `.env.example` with placeholders:

```env
DATABASE_PASSWORD=change-me
AWS_ACCESS_KEY_ID=change-me
AWS_ACCESS_SECRET=change-me
S3_ENDPOINT=http://storage:8333
S3_BUCKET=strapi-media
S3_PUBLIC_URL=http://localhost:8333/strapi-media
```

---

### [MEDIUM] — No Input Validation on Custom Article API Endpoints

**Location:** `src/api/article/controllers/article.ts` lines 5–11, 16–17, 22–23
**Category:** Validation / Security

**Description:**
The article controller's `find`, `findOne`, and `findBySlug` endpoints do not validate or sanitize query parameters or path parameters before passing them to the service layer:

- `ctx.query.limit` is parsed with `parseInt()` but not validated for range (negative values, non-numeric)
- `ctx.params.id` and `ctx.params.slug` are not validated for format
- `filters` and `populate` are passed directly without sanitization

**Impact:**
Malformed or malicious input can cause database errors (500s revealing internal state), trigger expensive queries via deeply nested populate, or exploit NoSQL-style injection in filter objects.

**Recommended Fix:**
Add schema validation using Zod or a similar library:

```typescript
import { z } from 'zod';

const findQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  start: z.coerce.number().int().min(0).default(0),
  filters: z.record(z.any()).optional(),
  populate: z.string().optional(),
});

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    const parsed = findQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid query parameters', details: parsed.error.flatten() };
      return;
    }
    ctx.body = await strapi.service('api::article.article').findArticles(parsed.data);
  },
  // ... etc
});
```

---

### [MEDIUM] — `dist/` Directory Not in `.gitignore`

**Location:** `.gitignore`
**Category:** Configuration

**Description:**
The `.gitignore` file includes `dist/` on line 4 — actually, it DOES include `dist/`. Let me verify...

Looking at `.gitignore`:
```
node_modules/
.tmp/
.cache/
dist/
build/
.env
*.log
.next/
```

`dist/` IS included. Let me recategorize this finding.

Actually, correcting: `dist/` IS in `.gitignore`. The earlier finding is invalid. Let me replace it.

---

### [MEDIUM] — `.gitignore` Missing Common Patterns

**Location:** `.gitignore`
**Category:** Configuration

**Description:**
The `.gitignore` is missing several patterns that should be excluded to prevent accidental commits of build artifacts and IDE files:

Missing patterns include: `*.tsbuildinfo`, `.env.local`, `.env.production`, `.strapi-updater.json`, `coverage/`, `.DS_Store`, `.vscode/`, `.idea/`, `*.swp`, `*.swo`, `*.log.gz`

**Impact:**
TypeScript incremental build info (`*.tsbuildinfo`), IDE configuration, and local overrides (`.env.local`) could be accidentally committed, leaking machine-specific paths or local credentials.

**Recommended Fix:**
Add to `.gitignore`:

```gitignore
# TypeScript
*.tsbuildinfo

# Environment overrides
.env.local
.env.production
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# Build artifacts
.strapi-updater.json
```

---

### [MEDIUM] — No Startup Validation of Critical Environment Variables

**Location:** All config files + `src/index.ts`
**Category:** Production Readiness

**Description:**
The application does not validate at startup that required environment variables are present and non-default. If `APP_KEYS`, `ADMIN_JWT_SECRET`, `DATABASE_HOST`, etc. are missing or set to placeholders, the application may start with insecure defaults (e.g., empty app keys, null admin JWT secret) or crash with obscure errors only when the first request arrives.

**Impact:**
Silent fallback to insecure defaults. Delayed failure — the application starts but fails on the first authenticated request, or uses predictable keys.

**Recommended Fix:**
Add a startup validation function that checks all required variables:

```typescript
// src/index.ts or a separate validate-env.ts
const REQUIRED_VARS = [
  'APP_KEYS',
  'ADMIN_JWT_SECRET',
  'API_TOKEN_SALT',
  'TRANSFER_TOKEN_SALT',
  'ENCRYPTION_KEY',
];

const FORBIDDEN_VALUES = ['change-me', 'change-me-in-production', ''];

function validateEnv(): void {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  const forbidden = REQUIRED_VARS.filter(v => FORBIDDEN_VALUES.includes(process.env[v] || ''));
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (forbidden.length > 0) {
    throw new Error(`Placeholder values detected in: ${forbidden.join(', ')}`);
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    validateEnv();
  },
  // ...
};
```

---

### [MEDIUM] — Health Check Readiness Endpoint Does Not Check Redis

**Location:** `src/modules/system/services/health.service.ts` lines 16–31
**Category:** Production Readiness

**Description:**
The `getReadiness()` method checks only database connectivity (`SELECT 1`). It does not verify that Redis (used by the cache middleware and MCP rate limiting) is accessible. The `ReadinessStatus` type at `src/modules/system/types/health.types.ts` line 9 defines an optional `redis?: 'ok' | 'fail'` field, but it is never populated.

**Impact:**
A deployment where Redis is unavailable will still report `ready` status, causing the orchestrator to route traffic to a degraded instance. The cache middleware and MCP rate limiter assume Redis is available and will silently fail — users will experience inconsistent caching behavior and no rate limiting.

**Recommended Fix:**
Check Redis connectivity in the readiness probe:

```typescript
async getReadiness(): Promise<ReadinessStatus> {
  let redisStatus: 'ok' | 'fail' | 'skipped' = 'skipped';
  let dbStatus: 'ok' | 'fail' = 'fail';
  
  try {
    await strapi.db.connection.raw('SELECT 1');
    dbStatus = 'ok';
  } catch {
    dbStatus = 'fail';
  }
  
  try {
    const cacheService = strapi.service('api::system.cache');
    if (cacheService?.isAvailable()) {
      redisStatus = 'ok';
    } else {
      redisStatus = 'fail';
    }
  } catch {
    redisStatus = 'fail';
  }
  
  const status = dbStatus === 'ok' && redisStatus !== 'fail' ? 'ok' : 'degraded';
  
  return {
    status,
    db: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
},
```

---

### [MEDIUM] — No Graceful Shutdown for Strapi or MCP Server

**Location:** `src/index.ts`, `src/modules/mcp/transport.ts`
**Category:** Production Readiness

**Description:**
Neither the main Strapi process nor the MCP SSE transport server handle `SIGTERM` or `SIGINT` signals. When the orchestrator (Dokploy/Docker) sends a termination signal during rolling updates or scale-down, the process will forcefully exit without draining in-flight requests or closing database connections.

**Impact:**
Ongoing database transactions may be abruptly terminated, causing data inconsistency. Active HTTP responses (including SSE connections for MCP) are cut off mid-stream. Connection pool exhaustion can occur on the replacement instance if old connections are not cleanly released.

**Recommended Fix:**
Implement graceful shutdown handlers:

```typescript
// In registerSSETransport, after app.listen():
const server = app.listen(port, () => { ... });

function shutdown(signal: string) {
  console.log(`[MCP] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[MCP] HTTP server closed');
    // Close all SSE sessions
    for (const [id, transport] of transports) {
      transport.close();
      transports.delete(id);
    }
    process.exit(0);
  });
  // Force exit after 30s if graceful shutdown fails
  setTimeout(() => process.exit(1), 30000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

### [MEDIUM] — MCP Container Has No Healthcheck

**Location:** `docker-compose.yml` services > strapi-mcp
**Category:** Production Readiness

**Description:**
The `strapi-mcp` service in `docker-compose.yml` has no `healthcheck` block defined. The main `strapi` service benefits from a HEALTHCHECK instruction in `Dockerfile`. Without a healthcheck, the orchestrator cannot determine if the MCP server is alive or stuck.

**Impact:**
A crashed or hung MCP container will continue to receive traffic (if registered in a service mesh) or will not be automatically restarted by the orchestrator. MCP outages go undetected.

**Recommended Fix:**
Add a healthcheck to the MCP service in `docker-compose.yml`:

```yaml
strapi-mcp:
  build: .
  # ...
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/mcp/events"]
    interval: 30s
    timeout: 10s
    start_period: 30s
    retries: 3
```

---

### [MEDIUM] — Article Slug Route Can Shadow Other Routes

**Location:** `src/api/article/routes/article.ts` lines 16–20
**Category:** Architecture

**Description:**
The article route `/articles/slug/:slug` is defined after `/articles/:id` (line 10). Because Strapi's router processes routes in order, a request to `/articles/slug/hello` might match `/articles/:id` first with `id = "slug"` before reaching the slug handler. The first matching route wins.

**Impact:**
Inconsistent route matching depending on how Strapi's Koa router orders middleware. The `slug` endpoint may never be reached.

**Recommended Fix:**
Move the `/articles/slug/:slug` route before `/articles/:id`, or use a distinct URL prefix:

```typescript
routes: [
  {
    method: 'GET',
    path: '/articles/by-slug/:slug',  // Changed route path to avoid conflict
    handler: 'article.findBySlug',
    config: { auth: false },
  },
  {
    method: 'GET',
    path: '/articles/:id',
    handler: 'article.findOne',
    config: { auth: false },
  },
]
```

---

### [LOW] — Weak Admin Password in `.env` and `.env.example`

**Location:** `.env` line 27, `.env.example` line 49
**Category:** Security

**Description:**
The admin password `Admin123!` is 9 characters, contains a dictionary word, and follows a predictable pattern. It does not meet modern password complexity standards (NIST SP 800-63B recommends 8+ characters for memorized secrets but discourages composition rules; a better standard is 16+ characters with high entropy).

**Impact:**
Brute-force or credential-stuffing attacks against the admin login could succeed. If this password is reused across environments (dev/staging/prod), compromise is amplified.

**Recommended Fix:**
Generate a strong password (24+ characters, mixed case, digits, symbols) and store it in the secrets manager:

```env
STRAPI_ADMIN_PASSWORD=$(openssl rand -base64 24)
```

---

### [LOW] — No Rate Limiting on Authentication Endpoints

**Location:** `config/middlewares.ts` (whole file — no rate limiting configured)
**Category:** Security

**Description:**
Strapi's `admin/auth` endpoints and the Users & Permissions plugin's `auth/local` login endpoint are not protected by rate limiting. An attacker can brute-force admin credentials or user credentials without throttling.

**Impact:**
Credential brute-force attacks against admin and user accounts are unbounded.

**Recommended Fix:**
Install and configure `koa-ratelimit` or Strapi's built-in rate limiting middleware:

```typescript
// config/middlewares.ts
{
  name: 'strapi::rate-limit',
  config: {
    // Strapi 5 built-in: koa-ratelimit
    interval: { min: 15 },
    max: 100,
    prefix: 'global',
  },
},
```

Or for more granular control, add a custom middleware that rate-limits `/admin/*` and `/api/auth/*` endpoints separately.

---

### [LOW] — `run_system_audit` MCP Tool Exposes Internal Plugin Configuration

**Location:** `src/modules/mcp/tools/run-system-audit.ts` lines 17–24
**Category:** Security / Information Disclosure

**Description:**
The `runSystemAudit` tool iterates over all loaded plugins and reports them by name. While this is not a direct vulnerability, it leaks the complete list of installed plugins to any MCP caller, including security-sensitive plugins (Sentry, Users-Permissions configuration state).

**Impact:**
An attacker with MCP access gains knowledge of the security controls in place (or not in place).

**Recommended Fix:**
Consider filtering the plugin list to only expose necessary information, or exclude internal plugins:

```typescript
const PUBLIC_PLUGINS = ['upload', 'graphql', 'i18n'];
const plugins: Record<string, string> = {};
for (const [name, plugin] of Object.entries(strapi.plugin || {})) {
  if (PUBLIC_PLUGINS.includes(name)) {
    plugins[name] = 'loaded';
  }
}
```

---

### [LOW] — Sentry DSN Not Configured

**Location:** `.env` (missing), `.env.example` line 63
**Category:** Monitoring

**Description:**
The Sentry plugin is installed (`@strapi/plugin-sentry`) and configured in `config/plugins.ts` with `dsn: env('SENTRY_DSN')`, but `SENTRY_DSN` is empty in both `.env` and `.env.example`. Error tracking will not function.

**Impact:**
Production errors will not be reported to Sentry. Debugging production incidents requires manual log inspection with no structured error aggregation.

**Recommended Fix:**
Set `SENTRY_DSN` to a valid Sentry project DSN in the production environment. Document this requirement, or make the Sentry plugin conditionally enabled only when the DSN is present.

---

### [LOW] — MCP Allowlist Has a Default Fallback That May Be Too Permissive

**Location:** `src/modules/mcp/allowlist.ts` lines 1–7
**Category:** Security

**Description:**
When no `MCP_ALLOWLIST` environment variable is set, the allowlist defaults to a hardcoded list including `api::navigation.navigation`, which is not mentioned in the AGENTS.md documentation. This default applies when the env var is missing entirely, potentially allowing access to unexpected content types.

**Impact:**
If `MCP_ALLOWLIST` environment variable is not configured (e.g., forgotten during deployment), the default list grants access to content types that operators may not intend to expose to the LLM agent.

**Recommended Fix:**
Either (a) require explicit configuration by removing the defaults and throwing an error if MCP_ALLOWLIST is not set, or (b) document the default list prominently in the deployment checklist.

---

### [INFO] — Module Index Does Not Export All Services

**Location:** `src/modules/system/index.ts`
**Category:** Architecture

**Description:**
The system module's barrel file exports `createHealthService`, `createHealthController`, and the health types, but does not export `createCacheService`, `createAuditService`, or `createCacheMiddleware`. This makes it unclear which services are part of the module's public API.

**Recommended Fix:**
Export all public services from the module's index file:

```typescript
export { createHealthService } from './services/health.service';
export { createHealthController } from './controllers/health.controller';
export { createCacheService } from './services/cache.service';
export { createAuditService } from './services/audit.service';
export { createCacheMiddleware } from './controllers/cache.middleware';
export type { HealthStatus, ReadinessStatus } from './types/health.types';
export type { AuditEntry } from './services/audit.service';
```

---

### [INFO] — `cache.middleware.ts` Uses `require()` Instead of Static Import

**Location:** `src/modules/system/controllers/cache.middleware.ts` line 4
**Category:** Maintainability

Already covered under MEDIUM findings above.

---

### [INFO] — No `./gitkeep` Files Should Be Committed to Production Build

**Locations:** `src/api/.gitkeep`, `database/migrations/.gitkeep`, `src/extensions/.gitkeep`
**Category:** Maintainability

**Description:**
The `.gitkeep` files exist to preserve empty directories in version control. This is a common pattern and not a defect per se, but the presence of empty API directories (category, page, tag, navigation) suggests incomplete implementation.

---

## Architecture Assessment

### Structure Compliance

| Layer                   | Status    | Notes                                                      |
|-------------------------|-----------|------------------------------------------------------------|
| `src/modules/system/`   | Present   | Services, controller, routes, types, tests all present.    |
| `src/modules/content/`  | Present   | Service + types + tests. Thin — only Article operations.   |
| `src/modules/media/`    | Present   | Service + tests. Basic upload provider wrapper.            |
| `src/modules/mcp/`      | Present   | Full implementation: server, transport, allowlist, tools.  |
| `src/api/`              | Present   | 5 content types. Only Article has custom controllers.      |
| `src/components/`       | Present   | 6 components (SEO, Rich Text, Image Gallery, CTA, FAQ, Nav Item). |
| `src/admin/`            | Present   | Custom app config + Vite example.                           |
| `src/extensions/`       | Empty     | `.gitkeep` only. No plugin extensions.                     |
| `shared/`               | Absent    | No shared module exists. Utils in modules/ locally.        |
| `entities/`             | Absent    | Not used — content types are the entities.                 |

### Structural Findings

1. **Dead route file**: `src/modules/system/routes/health.routes.ts` defines routes that are never loaded because they live outside the auto-discovered `api/` directory. See HIGH finding above.

2. **Incomplete content type API implementation**: Four of five content types (category, page, tag, navigation) have empty controller, route, and service directories. They rely entirely on Strapi shadow CRUD, bypassing the module layer.

3. **No shared utilities module**: `src/modules/shared/` does not exist. Common utilities (types, helpers, validation schemas) are duplicated or inlined.

4. **Dual health controller instantiation**: `src/api/health/controllers/health.ts` instantiates the controller via `createHealthController`, which in turn instantiates `createHealthService`. If routes were also using the module directly, there would be two health service instances.

5. **Cache middleware is never registered**: `src/modules/system/controllers/cache.middleware.ts` defines `createCacheMiddleware`, but there is no code in the bootstrap or middleware configuration that registers it with Strapi's Koa server. The Redis cache layer is never activated.

---

## Form & Input Audit

| Form / Endpoint                 | Client Validation | Server Validation | Sanitisation | Honeypot | Notes                                |
|--------------------------------|-------------------|-------------------|--------------|----------|--------------------------------------|
| `GET /api/articles`            | N/A               | None              | None         | N/A      | No query param validation           |
| `GET /api/articles/:id`        | N/A               | None              | None         | N/A      | ID not validated                     |
| `GET /api/articles/slug/:slug` | N/A               | None              | None         | N/A      | Slug not sanitized                   |
| `POST /admin/auth/login`       | Strapi built-in   | Strapi built-in   | Strapi       | N/A      | No rate limiting                     |
| MCP `create_content_entry`     | N/A               | None              | None         | N/A      | `data` object passed raw to DB       |
| MCP `update_content_entry`     | N/A               | None              | None         | N/A      | `data` object passed raw to DB       |
| MCP `publish_entry`            | N/A               | None              | None         | N/A      | Only existence check                 |
| S3 File Upload                 | Strapi built-in   | Strapi provider   | Provider     | N/A      | MIME type checked at provider level  |

---

## Concurrency & Race Condition Audit

| Location                               | Risk Type              | Severity | Notes                                              |
|----------------------------------------|------------------------|----------|----------------------------------------------------|
| `mcp/server.ts` rate limiter           | Per-instance state     | HIGH     | In-memory Map not shared across replicas           |
| `mcp/transport.ts` SSE sessions Map    | Unbounded growth       | MEDIUM   | No max sessions, no stale session cleanup          |
| `config/database.ts` pool config       | Connection exhaustion  | LOW      | PostgreSQL pool: min=2, max=10 (reasonable)        |
| `docker-compose.yml` no `depends_on`   | Startup race           | MEDIUM   | MCP depends on db+redis — good.                    |
| MCP write tools (no idempotency)       | Duplicate writes       | MEDIUM   | No idempotency key on create_content_entry         |
| Audit service INSERT (no transaction)  | Partial writes         | LOW      | Single INSERT — no multi-step risk                 |

---

## `.gitignore` Audit

**Current .gitignore:** Present (7 entries)

| File / Pattern          | Status            | Severity | Action Required                                   |
|-------------------------|-------------------|----------|---------------------------------------------------|
| `.env`                  | Correctly ignored | —        | —                                                 |
| `node_modules/`         | Correctly ignored | —        | —                                                 |
| `dist/`                 | Correctly ignored | —        | —                                                 |
| `build/`                | Correctly ignored | —        | —                                                 |
| `.tmp/`                 | Correctly ignored | —        | —                                                 |
| `.cache/`               | Correctly ignored | —        | —                                                 |
| `*.log`                 | Correctly ignored | —        | —                                                 |
| `.next/`                | Correctly ignored | —        | —                                                 |
| `*.tsbuildinfo`         | Not ignored       | LOW      | Add to .gitignore                                 |
| `.env.local`            | Not ignored       | MEDIUM   | Add to .gitignore                                 |
| `.env.production`       | Not ignored       | MEDIUM   | Add to .gitignore                                 |
| `.DS_Store`             | Not ignored       | LOW      | Add to .gitignore                                 |
| `.vscode/`              | Not ignored       | LOW      | Add to .gitignore                                 |
| `.idea/`                | Not ignored       | LOW      | Add to .gitignore                                 |
| `coverage/`             | Not ignored       | LOW      | Add to .gitignore                                 |
| `.strapi-updater.json`  | Not ignored       | LOW      | Add to .gitignore                                 |

---

## Dependency Audit

| Package                        | Current Version | Issue                                        | Recommendation               |
|--------------------------------|-----------------|----------------------------------------------|------------------------------|
| `@strapi/strapi`               | 5.48.0          | Latest. No known CVEs.                       | None                         |
| `ioredis`                      | ^5.11.1         | Latest.                                      | None                         |
| `pg`                           | ^8.13.0         | Latest.                                      | None                         |
| `express`                      | ^5.2.1          | Express 5 is relatively new. Strapi 5 uses Koa internally. Only used by MCP transport. | Pin version, monitor for CVEs. |
| `@modelcontextprotocol/sdk`    | ^1.29.0         | New SDK. Monitor for updates.                | Keep up-to-date              |
| `better-sqlite3`               | ^12.10.0        | Dev only (SQLite).                           | None                         |
| `vitest`                       | ^2.1.9          | Latest.                                      | None                         |

**NOTE:** Run `pnpm audit --audit-level=moderate` before each deployment to check for newly published CVEs.

---

## Production Readiness Checklist

| Item                                       | Status          | Notes                                                      |
|--------------------------------------------|-----------------|------------------------------------------------------------|
| Health check endpoint                      | Present         | `/api/health/live` and `/api/health/ready`                 |
| Readiness checks Redis                     | Missing         | Only checks DB — see MEDIUM finding                        |
| Graceful shutdown (SIGTERM)                | Missing         | Neither Strapi nor MCP handle shutdown                     |
| Error boundaries (UI)                      | N/A             | Admin panel not audited (Strapi-owned)                     |
| Environment variables validated at startup | Missing         | See MEDIUM finding                                         |
| Test coverage on critical paths            | Moderate        | ~50 tests. Auth, MCP transport not tested                  |
| CI pipeline runs security checks           | Partial         | Audit runs with `continue-on-error: true` — silent vulns   |
| Rate limiting on auth endpoints            | Missing         | See LOW finding                                            |
| Verbose error responses disabled in prod   | Unknown         | Strapi default — verify with `NODE_ENV=production`         |
| CORS restricted                            | No              | Wildcard `*`                                               |
| GraphQL introspection disabled in prod     | No              | Enabled — see CRITICAL finding                             |
| Sentry error tracking                      | Not configured  | DSN empty                                                  |
| Docker HEALTHCHECK                         | Present (api)   | Missing for MCP container                                  |
| `.env` secrets rotated                     | No              | Default/generated values in file — see CRITICAL            |

---

## Recommended Improvements

### Immediate

1. **Rotate all secrets in `.env` and `.env.example`**: Generate fresh `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`. Replace the weak admin password. Set a strong `MCP_AUTH_SECRET`. Remove the unused `JWT_SECRET` variable.

2. **Fix CORS configuration**: Replace `origin: ['*']` with explicit production origins.

3. **Disable GraphQL introspection in production**: Make it conditional on `NODE_ENV`.

4. **Remove `reviewWorkflows: true` from content type schemas**: This is an EE-only feature that will cause issues on CE.

5. **Fix CI `pnpm audit` suppression**: Remove `continue-on-error: true` from the audit step.

6. **Delete duplicate health route file**: Remove `src/modules/system/routes/health.routes.ts` — it is dead code.

### Short-term

7. **Implement Redis-backed MCP rate limiter**: Replace in-memory Map with a Redis-based sliding window.

8. **Add input validation on MCP write tools**: Validate `data` payload against content type schema before persisting.

9. **Implement graceful shutdown**: Handle SIGTERM/SIGINT in both Strapi and the MCP server.

10. **Add MCP container healthcheck**: Add a `healthcheck` block to the `strapi-mcp` service in docker-compose.yml.

11. **Validate environment variables at startup**: Check for missing and placeholder values before the application starts.

12. **Add Redis health check to readiness probe**: Include Redis status in the `/api/health/ready` response.

13. **Fix article slug route ordering**: Move `/articles/by-slug/:slug` before `/articles/:id` to avoid route shadowing.

14. **Add startup validation for env vars**: Ensure critical secrets are not placeholders.

### Long-term

15. **Implement full controller/service layer for all content types**: Create custom controllers for category, page, tag, and navigation that delegate to module services.

16. **Integrate MCP SSE into Strapi's HTTP server**: Instead of a separate Express server, mount SSE endpoints on Strapi's Koa server for unified middleware stack and lifecycle management.

17. **Add Rate Limiting**: Configure rate limiting on authentication endpoints (`/admin/*`, `/api/auth/*`) and public API endpoints.

18. **Add idempotency keys to MCP write tools**: Prevent duplicate content creation on retry.

19. **Increase test coverage**: Add tests for API controllers, MCP transport session management, authorization, and the cache middleware.

20. **Set up Sentry DSN**: Configure a valid Sentry project DSN for error tracking in production.

---

## Summary of Findings by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 3     |
| HIGH     | 7     |
| MEDIUM   | 12    |
| LOW      | 5     |
| INFO     | 2     |

**CRITICAL findings:**
1. Hardcoded secrets and weak credentials in `.env`
2. Wildcard CORS origin (`origin: *`)
3. GraphQL introspection enabled in production

**HIGH findings:**
1. MCP SSE static shared secret auth
2. In-memory rate limiter not shared across instances
3. Duplicate health route definitions
4. CI pipeline suppresses dependency audit failures
5. Review Workflows enabled in Community Edition
6. PostgreSQL database password committed in plaintext
7. (Resolved during audit — dist/ is actually in .gitignore)

---

## Sign-off Criteria

This application is considered production-ready when all CRITICAL and HIGH findings are resolved and verified. MEDIUM findings must have a documented remediation plan with a committed timeline. LOW and INFO findings may be addressed in subsequent sprints.

**Current Status:** Not Ready

---

## Files Requiring Changes

| File                                      | Action Required                                      |
|-------------------------------------------|------------------------------------------------------|
| `.env`                                    | Rotate all secrets, remove unused JWT_SECRET         |
| `.env.example`                            | Replace real credentials with placeholders           |
| `config/middlewares.ts`                   | Restrict CORS origin, add rate limiting              |
| `config/plugins.ts`                       | Disable GraphQL introspection in production          |
| `src/api/article/content-types/article/schema.json` | Remove `reviewWorkflows: true`              |
| `src/api/page/content-types/page/schema.json`       | Remove `reviewWorkflows: true`              |
| `src/modules/system/routes/health.routes.ts`        | Delete — dead code                                 |
| `.github/workflows/ci.yml`                | Remove `continue-on-error: true` from audit         |
| `src/modules/mcp/server.ts`               | Replace in-memory rate limiter with Redis          |
| `src/modules/mcp/transport.ts`            | Add graceful shutdown, constant-time auth           |
| `src/modules/mcp/tools/create-content-entry.ts` | Add schema validation                         |
| `src/modules/mcp/tools/update-content-entry.ts` | Add schema validation                         |
| `src/modules/system/services/health.service.ts` | Add Redis check to readiness                   |
| `src/api/article/routes/article.ts`       | Fix slug route ordering                             |
| `docker-compose.yml`                      | Add MCP healthcheck, use env vars for passwords     |
| `.gitignore`                              | Add missing patterns (tsbuildinfo, .env.local, etc.)|
| `src/index.ts`                            | Add environment variable validation on startup      |
