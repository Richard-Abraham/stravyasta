# Stravyasta — Strapi 5 CMS Production Build

## Overview

Production-grade **Strapi 5 CMS** with Domain-Driven Design module structure, Model Context Protocol (MCP) integration for AI agent access, multi-stage Docker builds, Redis caching, GraphQL, and CI/CD.

Built for **Dokploy** (Docker-based) deployment, compatible with existing Vyasta infrastructure (PostgreSQL, SeaweedFS S3, Maildev).

### Features

| Feature | Status |
|---|---|
| **Strapi 5** with TypeScript | ✅ |
| **PostgreSQL** (SQLite for local dev) | ✅ |
| **S3 media upload** (SeaweedFS) | ✅ |
| **Email** (Maildev / Resend SMTP) | ✅ |
| **Multi-stage Docker build** (~400MB) | ✅ |
| **docker-compose** (PG + S3 + Redis + Maildev) | ✅ |
| **Health checks** (`/api/health/live`, `/api/health/ready`) | ✅ |
| **Content types**: Article, Page, Category, Tag, Navigation | ✅ |
| **Components**: SEO, Rich Text, Image Gallery, CTA, FAQ | ✅ |
| **Dynamic Zones** on Article and Page | ✅ |
| **Internationalization** (i18n) | ✅ |
| **GraphQL** plugin | ✅ |
| **Redis caching** middleware (graceful fallback) | ✅ |
| **Security**: CSP headers, CORS, registration disabled | ✅ |
| **Audit logging** service | ✅ |
| **Sentry error tracking** | ✅ |
| **GitHub Actions CI/CD** | ✅ |
| **MCP v1**: read-only tools (query, schema, audit) | ✅ |
| **MCP v2**: write tools (create, update, publish, dry-run) | ✅ |
| **MCP SSE transport** with auth + rate limiting | ✅ |
| **DDD module structure** (`src/modules/`) | ✅ |
| **54 unit tests** (vitest) | ✅ |

---

## Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/Richard-Abraham/stravyasta.git
cd stravyasta

# 2. Install dependencies
pnpm install

# 3. Start (SQLite — no external services needed)
pnpm develop
# Admin: http://localhost:1337/admin
# Login:  admin@strapi.local / Str0ng!Admin#2026
```

---

## Production Setup (Docker + PostgreSQL)

### Option A: Self-Contained Docker Compose

```bash
# Start all services (PG, SeaweedFS, Maildev, Redis, Strapi)
docker compose up -d

# Admin at http://localhost:1337/admin
# PG at localhost:5545 | S3 at localhost:8334 | Maildev at localhost:1081 | Redis at localhost:6380
```

### Option B: Dokploy Deployment

1. Create a new project in **Dokploy**
2. Connect your GitHub repo (`Richard-Abraham/stravyasta`)
3. Set **Build method** to `Dockerfile`
4. Set environment variables (see below)
5. Set **Health check** to `/api/health/live` on port `1337`
6. Deploy

### Required Environment Variables (for Production)

Set these in Dokploy or your `.env` file. Generate unique secrets:

```bash
openssl rand -base64 32   # Run this 5 times for your secrets
```

| Variable | Description | Example |
|---|---|---|
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `1337` |
| `APP_KEYS` | 4 comma-sep keys | `key1,key2,key3,key4` |
| `API_TOKEN_SALT` | API token salt | `openssl rand -base64 32` |
| `ADMIN_JWT_SECRET` | Admin JWT secret | `openssl rand -base64 32` |
| `TRANSFER_TOKEN_SALT` | Transfer token salt | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Encryption key | `openssl rand -base64 32` |
| `JWT_SECRET` | Users-permissions JWT | `openssl rand -base64 32` |
| `DATABASE_CLIENT` | DB type | `postgres` |
| `DATABASE_HOST` | DB host | `db` (Docker) or your PG host |
| `DATABASE_PORT` | DB port | `5432` |
| `DATABASE_NAME` | DB name | `strapi` |
| `DATABASE_USERNAME` | DB user | `vyasta` |
| `DATABASE_PASSWORD` | DB password | `change-me` |
| `DATABASE_SSL` | SSL enabled | `false` |
| `AWS_ACCESS_KEY_ID` | S3 access key | `vyasta` |
| `AWS_ACCESS_SECRET` | S3 secret key | `vyastapass` |
| `AWS_REGION` | S3 region | `us-east-1` |
| `S3_ENDPOINT` | S3 endpoint URL | `http://storage:8333` |
| `S3_BUCKET` | S3 bucket name | `strapi-media` |
| `SMTP_HOST` | SMTP host | `maildev` or your SMTP |
| `SMTP_PORT` | SMTP port | `1025` |
| `EMAIL_FROM` | From address | `Strapi <noreply@example.com>` |
| `REDIS_HOST` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `CORS_ORIGIN` | Allowed CORS origin | `https://yourdomain.com` |
| `GRAPHQL_INTROSPECTION` | Enable GraphQL playground | `false` |
| `ENABLE_MCP` | Enable MCP server | `false` on API, `true` on MCP |
| `MCP_AUTH_SECRET` | MCP auth header | `openssl rand -base64 32` |
| `MCP_TRANSPORT` | MCP transport | `sse` |
| `MCP_PORT` | MCP SSE port | `3001` |
| `MCP_ALLOWLIST` | Allowed content UIDs | `api::article.article,...` |
| `MCP_WRITE_ENABLED` | Enable write tools | `false` (start read-only) |
| `MCP_RATE_LIMIT` | Max req/min | `60` |
| `SENTRY_DSN` | Sentry DSN | (optional) |

---

## MCP (Model Context Protocol) Integration

### What is MCP?

MCP is an open standard that lets **AI agents (LLMs)** call tools in your Strapi CMS. Instead of an LLM guessing or hallucinating about your content, it can run real queries against your database through secure, gated tools.

### Available Tools

| Tool | Type | Description |
|---|---|---|
| `query_content_collection` | Read | Fetch paginated content entries with filters |
| `get_collection_schema` | Read | Get field definitions for any content type |
| `run_system_audit` | Read | Check Strapi version, plugins, DB health |
| `create_content_entry` | Write | Create a new content entry |
| `update_content_entry` | Write | Update an existing entry |
| `publish_entry` | Write | Publish/unpublish an entry |

### How to Run MCP

**Locally (Stdio):**
```bash
ENABLE_MCP=true MCP_TRANSPORT=stdio pnpm develop
```
Then connect any MCP client (Claude Code, Continue.dev, etc.) pointing to this process.

**Production (SSE — separate container):**
```bash
# Docker Compose with MCP profile
docker compose --profile mcp up -d
# MCP available at: http://your-host:3001/mcp/events
```

### Connecting Claude Code

Configure MCP in your project's config (already done for Stravyasta):

```bash
claude mcp add stravyasta \
  -e ENABLE_MCP=true \
  -e MCP_TRANSPORT=stdio \
  -- pnpm strapi develop
```

Then from the `stravyasta/` directory:
```bash
claude
# Try: "Run a system audit on the Strapi CMS"
```

### Connecting Any MCP Client (SSE)

```json
{
  "mcpServers": {
    "stravyasta": {
      "type": "sse",
      "url": "http://your-strapi-host:3001/mcp/events",
      "headers": {
        "x-mcp-secret": "your-mcp-auth-secret"
      }
    }
  }
}
```

### Security

- **UID Allowlist**: Only UIDs in `MCP_ALLOWLIST` can be queried/modified
- **Auth Header**: SSE transport requires `x-mcp-secret` header matching `MCP_AUTH_SECRET`
- **Rate Limited**: 60 requests/minute per client (configurable)
- **Write Gate**: Write tools disabled by default — set `MCP_WRITE_ENABLED=true` to enable
- **Dry Run**: Write tools support `dryRun: true` for previewing without persisting

### Testing MCP via Curl

```bash
# Start Strapi with MCP
ENABLE_MCP=true MCP_TRANSPORT=sse MCP_PORT=3001 pnpm develop

# List all tools
curl -X POST "http://localhost:3001/mcp/events?sessionId=test" \
  -H "x-mcp-secret: your-secret"
# Then in another terminal:
curl -X POST "http://localhost:3001/mcp/messages?sessionId=test" \
  -H "Content-Type: application/json" \
  -H "x-mcp-secret: your-secret" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"run_system_audit","arguments":{}}}'
```

---

## Architecture

### DDD Module Structure

```
src/
  modules/                    # Business logic (no Strapi coupling)
    system/                   # Health, audit, cache, config
    content/                  # Content operations
    media/                    # Media operations
    mcp/                      # MCP server, tools, transport
  api/                        # Strapi content types + thin delegates
    article/                  # Delegates to content module
    category/                 # Auto-generated CRUD
    page/                     # Auto-generated CRUD
    tag/                      # Auto-generated CRUD
    navigation/               # Auto-generated CRUD
    health/                   # Delegates to system module
  components/                 # Shared components
    shared/                   # SEO, Rich Text, Image Gallery, CTA, FAQ
    navigation/               # Navigation items
  admin/                      # Admin panel customization
```

### Two Compute Roles

```
┌─────────────────────┐    ┌──────────────────────┐
│   strapi-api         │    │   strapi-mcp          │
│   Port 1337          │    │   Port 3001           │
│   ENABLE_MCP=false   │    │   ENABLE_MCP=true     │
│   Public REST/GraphQL │    │   AI agent access     │
│   Multi-instance     │    │   Single-instance     │
└─────────────────────┘    └──────────────────────┘
```

### Content Types

| Type | Kind | i18n | Draft/Publish | Dynamic Zones |
|---|---|---|---|---|
| **Article** | Collection | ✅ | ✅ | contentBlocks |
| **Page** | Collection | ✅ | ✅ | layout |
| **Category** | Collection | ✅ | ❌ | — |
| **Tag** | Collection | ❌ | ❌ | — |
| **Navigation** | Single | ❌ | ❌ | — |

### Components

| Component | Usage | Repeatable |
|---|---|---|
| **SEO** | Article, Page | ❌ |
| **Rich Text** | Dynamic Zone | — |
| **Image Gallery** | Dynamic Zone | — |
| **CTA** (Call to Action) | Dynamic Zone | — |
| **FAQ** | Dynamic Zone | ✅ |
| **Navigation Item** | Navigation | ✅ |

---

## Connecting a Frontend

Strapi is a **headless CMS** — it provides APIs. Your frontend consumes them.

### REST API

```javascript
// Fetch articles
const articles = await fetch('http://localhost:1337/api/articles?populate=*')
  .then(r => r.json());

// Fetch single article by slug
const article = await fetch('http://localhost:1337/api/articles/slug/my-article')
  .then(r => r.json());

// Fetch pages with content blocks
const pages = await fetch('http://localhost:1337/api/pages?populate=layout')
  .then(r => r.json());

// Fetch navigation
const nav = await fetch('http://localhost:1337/api/navigation?populate=items')
  .then(r => r.json());
```

### GraphQL

```graphql
query {
  articles(pagination: { limit: 10 }) {
    data {
      id
      attributes {
        title
        slug
        excerpt
        body
        category { data { attributes { name } } }
        tags { data { attributes { name } } }
      }
    }
  }
}
```

### Frontend Framework Examples

**Next.js** (recommended — matches your Vyasta stack):
```typescript
// pages/articles/[slug].tsx
export async function getStaticProps({ params }) {
  const res = await fetch(`${STRAPI_URL}/api/articles/slug/${params.slug}`);
  const { data } = await res.json();
  return { props: { article: data } };
}
```

**Astro**:
```astro
---
const res = await fetch('http://localhost:1337/api/articles?populate=*');
const { data } = await res.json();
---
{data.map(article => <Article {...article} />)}
```

**Or any framework** — React, Vue, Svelte, plain HTML/JS. Just fetch from the API.

### Using MCP with Your Frontend

The MCP server is for **AI agents** (not for your frontend). Your frontend uses REST/GraphQL APIs directly. MCP is for:
- LLM-powered content creation (e.g., "write an article about X")
- AI-assisted content management
- Automated content operations via scripts

---

## Testing

```bash
# Run all 54 tests
pnpm test

# Watch mode
pnpm test:watch

# Test structure
src/
  modules/
    system/tests/       # Health service, Audit service, Cache service
    content/tests/      # Content service
    media/tests/        # Media service
    mcp/tests/          # MCP allowlist, read tools, write tools
  tests/                # Build integrity, Security
```

Tests are framework-agnostic (vitest) and mock Strapi's services — they don't require a running database.

---

## CI/CD

### GitHub Actions

**On Pull Request** (`.github/workflows/ci.yml`):
1. Install dependencies
2. TypeScript check
3. Run 54 tests
4. Dependency audit
5. Docker build check

**On Merge to Main** (`.github/workflows/deploy.yml`):
1. Build Docker image
2. Push to GitHub Container Registry (GHCR)
3. Tagged with `latest` and commit SHA

### Branch Protection

Main branch is protected:
- Requires 1 PR approval
- No direct pushes (use PRs)
- No force pushes

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/articles` | Optional | List articles |
| GET | `/api/articles/:id` | Optional | Get article by ID |
| GET | `/api/articles/slug/:slug` | Optional | Get article by slug |
| GET | `/api/pages` | Optional | List pages |
| GET | `/api/pages/:id` | Optional | Get page by ID |
| GET | `/api/categories` | Optional | List categories |
| GET | `/api/tags` | Optional | List tags |
| GET | `/api/navigation` | Optional | Get navigation |
| POST | `/api/auth/local` | Public | Login |
| POST | `/api/auth/local/register` | Disabled | Registration disabled |
| GET | `/api/health/live` | None | Liveness check |
| GET | `/api/health/ready` | None | Readiness check |
| POST | `/api/graphql` | Optional | GraphQL queries |

---

## Docker Architecture

```
┌─────────────────────────────────────────────────┐
│                  Docker Compose                   │
│                                                   │
│  ┌──────┐  ┌──────────┐  ┌──────┐  ┌─────────┐  │
│  │  PG   │  │ SeaweedFS│  │Redis │  │ Maildev  │  │
│  │:5432 │  │  :8333   │  │:6379 │  │:1025    │  │
│  └──┬───┘  └────┬─────┘  └──┬───┘  └────┬────┘  │
│     └───────┬───┴───────────┴───┴────────┘       │
│             │                                     │
│     ┌───────▼───────┐    ┌───────────────┐        │
│     │  strapi-api   │    │  strapi-mcp   │        │
│     │  Port 1337    │    │  Port 3001    │        │
│     └───────────────┘    └───────────────┘        │
└─────────────────────────────────────────────────┘
```

### Health Checks

- **Liveness**: `GET /api/health/live` → `{"status":"ok"}`
- **Readiness**: `GET /api/health/ready` → `{"status":"ok","db":"ok"}`
- **Docker**: HEALTHCHECK runs every 30s, timeout 5s, 3 retries

---

## File Structure

```
stravyasta/
├── config/                    # Strapi config
│   ├── admin.ts               # Admin panel config
│   ├── api.ts                 # API settings
│   ├── database.ts            # Database config (SQLite/PostgreSQL)
│   ├── middlewares.ts         # CSP, CORS, security
│   ├── plugins.ts             # Upload, GraphQL, Sentry, Users-Permissions
│   └── server.ts              # Server config
├── src/
│   ├── admin/                 # Admin panel customization
│   │   └── app.tsx            # Logo, favicon, locales
│   ├── api/                   # Content types + custom endpoints
│   │   ├── article/           # Article content type
│   │   ├── category/          # Category content type
│   │   ├── health/            # Health check endpoints
│   │   ├── navigation/        # Navigation single type
│   │   ├── page/              # Page content type
│   │   └── tag/               # Tag content type
│   ├── components/            # Shared components
│   │   ├── navigation/        # Navigation item component
│   │   └── shared/            # SEO, Rich Text, Gallery, CTA, FAQ
│   ├── modules/               # DDD business logic
│   │   ├── content/           # Content operations
│   │   ├── mcp/               # MCP server + tools + transport
│   │   ├── media/             # Media operations
│   │   └── system/            # Health, audit, cache
│   ├── extensions/            # Plugin extensions
│   ├── index.ts               # Bootstrap (admin + MCP init)
│   └── tests/                 # Integration-level tests
├── scripts/
│   └── ensure-bucket.mjs      # S3 bucket creation script
├── docker/                     # Docker config
│   └── seaweedfs/             # SeaweedFS S3 config
├── public/
│   └── uploads/               # Brand assets (logo, favicon)
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # All services + MCP replica
├── docker-entrypoint.sh        # Container entrypoint
├── vitest.config.ts            # Test config
├── .env.example                # Environment variable template
├── .github/workflows/          # CI/CD pipelines
├── AGENTS.md                   # Architecture decisions
├── NOTES.md                    # Implementation log
├── TASKPLAN.md                 # Full task tracking
└── AUDIT.md                    # Security audit report
```

---

## Troubleshooting

**Strapi won't start (port in use):**
```bash
lsof -i :1337  # Find what's using port 1337
kill <PID>     # Kill the process
```

**Admin login not working:**
```bash
# Create admin user via CLI
pnpm strapi admin:create-user \
  --email=admin@strapi.local \
  --password=Str0ng!Admin#2026 \
  --firstname=Admin \
  --lastname=User
```

**Database migration errors:**
```bash
# Reset database (SQLite local dev)
rm -f .tmp/data.db
pnpm develop
```

**MCP not responding:**
```bash
# Check MCP is enabled and running
curl http://localhost:3001/mcp/events?sessionId=test \
  -H "x-mcp-secret: your-secret"
# Expected: SSE stream connection established
```

**Permission denied for S3 bucket:**
```bash
# Create bucket manually
node scripts/ensure-bucket.mjs
```

---

## Phase 7 — Production Readiness Gaps Closed

### Webpack Admin URL Injection

For multi-environment deployments, set `STRAPI_ADMIN_BACKEND_URL` at build time:

```bash
docker build \
  --build-arg STRAPI_ADMIN_BACKEND_URL=https://api.yourdomain.com \
  -t stravyasta .
```

Config in `src/admin/webpack.config.ts` injects it into the admin panel bundle.

### PM2 Cluster Mode (Fallback)

If deploying without Dokploy, use PM2:

```bash
pnpm add -g pm2
pm2 start ecosystem.config.js --env production
```

This runs:
- `strapi-api` — cluster mode (one worker per CPU), no MCP
- `strapi-mcp` — fork mode, single instance, `ENABLE_MCP=true`

### Container Vulnerability Scanning

Every PR runs Trivy in CI to scan for HIGH/CRITICAL CVEs. The build fails if any are found. Config in `.github/workflows/ci.yml`.

### Database Backup Script

```bash
# Before any schema migration in production:
./scripts/backup-db.sh ./backups
# Supports PostgreSQL (pg_dump) and SQLite
# Creates: backups/strapi_20250101_120000.sql.gz
```

### PgBouncer (for 3+ compute nodes)

When scaling to 3+ Strapi instances, configure PgBouncer between the application and PostgreSQL:

```bash
# docker-compose addition:
pgbouncer:
  image: edoburu/pgbouncer:latest
  environment:
    DB_HOST: db
    DB_PORT: 5432
    DB_USER: vyasta
    DB_PASSWORD: vyasta
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 200
    DEFAULT_POOL_SIZE: 25
  ports:
    - "6432:5432"
```

Then set `DATABASE_HOST=pgbouncer` and `DATABASE_PORT=6432` in your services.

---

## Complete Test Report

**72 tests, 11 suites, all passing:**

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
| Security | 5 |
| Build integrity | 6 |
| Production readiness | 18 |

---

## Repository

**GitHub**: `https://github.com/Richard-Abraham/stravyasta`

### Quick Commands

```bash
# Get the code
git clone https://github.com/Richard-Abraham/stravyasta.git

# Local dev
cd stravyasta && pnpm install && pnpm develop

# Run tests
pnpm test

# Build admin panel
pnpm build

# Full Docker stack
docker compose up -d

# With MCP replica
docker compose --profile mcp up -d
```
