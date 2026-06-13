# MCP (Model Context Protocol) — Stravyasta

## What MCP Does

MCP is an open standard that lets **AI agents (LLMs) call tools in Strapi**. Instead of an AI
guessing or hallucinating about your content, it can run real queries against your database
through secure, gated tools.

Think of MCP as giving an AI assistant **read/write access to your CMS** — but through a
controlled interface with authentication, rate limiting, and content-type allowlisting.

---

## Available Tools (6 Total)

### Read Tools (Safe — No Changes)

| Tool | Description | Example Prompt |
|---|---|---|
| `query_content_collection` | Fetch paginated content entries with filters | "Show me all published articles" |
| `get_collection_schema` | Get field definitions for any content type | "What fields does the Page type have?" |
| `run_system_audit` | Check Strapi version, plugins, DB health | "Is the CMS healthy? What version?" |

### Write Tools (Gated by `MCP_WRITE_ENABLED=true`)

| Tool | Description | Example Prompt |
|---|---|---|
| `create_content_entry` | Create a new content entry | "Write a new article titled 'Hello World'" |
| `update_content_entry` | Update an existing entry by UID + ID | "Update the excerpt on article #5" |
| `publish_entry` | Publish/unpublish a content entry | "Publish article #3" |

All write tools support `dryRun: true` — preview changes without persisting.

---

## How MCP Runs

### Mode 1: Stdio — Local Developer Use

Claude Code (or any MCP client) runs Strapi as a subprocess and communicates via stdin/stdout.

**Claude Code MCP config (~/.claude.json):**

```json
{
  "stravyasta": {
    "type": "stdio",
    "command": "pnpm",
    "args": ["strapi", "develop"],
    "env": {
      "ENABLE_MCP": "true",
      "MCP_TRANSPORT": "stdio"
    }
  }
}
```

When you run `claude` in the project directory, it automatically starts the MCP server.

### Mode 2: SSE — Remote / Production Use

A dedicated container runs alongside the API with MCP enabled, communicating via
Server-Sent Events over HTTP.

**Docker Compose (already configured):**

```bash
docker compose --profile mcp up -d
# MCP available at http://localhost:3001/mcp/events
```

**Connecting via SSE:**

```json
{
  "mcpServers": {
    "stravyasta": {
      "type": "sse",
      "url": "http://your-host:3001/mcp/events",
      "headers": {
        "x-mcp-secret": "your-mcp-auth-secret"
      }
    }
  }
}
```

---

## Architecture

```
┌─────────────────────┐    ┌──────────────────────┐
│   strapi-api         │    │   strapi-mcp          │
│   Port 1337          │    │   Port 3001           │
│   ENABLE_MCP=false   │    │   ENABLE_MCP=true     │
│   Public REST/GraphQL │    │   AI agent access     │
│   Multi-instance     │    │   Single-instance     │
└─────────────────────┘    └──────────────────────┘
```

Two isolated containers — AI traffic never competes with user traffic.

---

## Security Controls

| Control | Config | Default |
|---|---|---|
| **ENABLE_MCP gate** | `ENABLE_MCP` env var | `false` |
| **UID Allowlist** | `MCP_ALLOWLIST` env var | Article, Page, Category, Tag |
| **Auth Header** | `MCP_AUTH_SECRET` env var | Required for SSE |
| **Rate Limiting** | `MCP_RATE_LIMIT` env var | 60 req/min |
| **Write Gate** | `MCP_WRITE_ENABLED` env var | `false` (read-only) |
| **Dry Run** | `dryRun: true` in tool args | Preview without persisting |

### UID Allowlist

Only content types in the allowlist can be queried or modified:

```
MCP_ALLOWLIST=api::article.article,api::page.page,api::category.category,api::tag.tag
```

Requests for UIDs outside this list are rejected at the handler boundary (before
Entity Service is invoked) with: `"Access denied: UID is not in the allowlist"`

### Authentication

SSE transport requires `x-mcp-secret` header matching the server's `MCP_AUTH_SECRET`.
Stdio transport inherits the parent process's security context.

### Rate Limiting

Default: **60 requests per minute** per client. Configurable via `MCP_RATE_LIMIT`.

---

## Testing End-to-End

### Local (via curl)

```bash
# Start Strapi with MCP
ENABLE_MCP=true MCP_TRANSPORT=sse MCP_PORT=3001 pnpm develop

# List all available tools
curl -X POST "http://localhost:3001/mcp/events?sessionId=test" \
  -H "x-mcp-secret: your-secret"

# Then send a tools/list request
curl -X POST "http://localhost:3001/mcp/messages?sessionId=test" \
  -H "Content-Type: application/json" \
  -H "x-mcp-secret: your-secret" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"run_system_audit","arguments":{}}}'
```

### Production (via ngrok or public URL)

```bash
# Expose MCP port
ngrok http 3001

# Connect from any MCP client using the ngrok URL + auth secret
```

---

## Use Cases

### Developer Content Operations

A developer in Claude Code can ask:

> *"Create 5 articles about our new product launch, each with different titles and excerpts, and publish them"*

MCP creates and publishes all 5 entries in Strapi automatically.

### Automated Content Pipelines

A CI/CD script or cron job can:

> *"Generate weekly reports by fetching all published articles, analyzing engagement, and creating a summary page"*

### AI-Assisted Content Management

Editors can ask:

> *"Find all articles about AI that are still drafts and publish them"*

MCP queries, filters, and updates content based on natural language instructions.

---

## Production Deployment

The MCP server is **production-ready**. It runs in an isolated container with its own
health checks, rate limiting, and authentication. To deploy:

```bash
docker compose --profile mcp up -d
```

Set the required environment variables in Dokploy:

| Variable | Value |
|---|---|
| `ENABLE_MCP` | `true` |
| `MCP_TRANSPORT` | `sse` |
| `MCP_PORT` | `3001` |
| `MCP_AUTH_SECRET` | `openssl rand -base64 32` |
| `MCP_WRITE_ENABLED` | `false` (start read-only) |
| `MCP_RATE_LIMIT` | `60` |
| `MCP_ALLOWLIST` | `api::article.article,...` |

---

## Comparison vs Competitors

| Feature | Stravyasta | Contentful | Sanity |
|---|---|---|---|
| **MCP / AI agent access** | ✅ Built-in | ❌ None | ❌ None |
| **Self-hosted** | ✅ | ❌ SaaS only | ❌ SaaS only |
| **Write tools with dry-run** | ✅ | ❌ | ❌ |
| **UID allowlist for AI** | ✅ | ❌ | ❌ |
| **Rate-limited AI access** | ✅ | ❌ | ❌ |

MCP is the **key differentiator** — no other CMS offers a standardized protocol for
AI agents to securely read and write content.

---

## Using Your OpenAI Key

### Option 1: Strapi AI Content Generation (Admin Panel Built-in)

Strapi 5 has a built-in AI feature that helps editors generate article content
directly inside the admin panel (headlines, summaries, full text).

**To enable it:**

1. Set your OpenAI key in Strapi's admin panel:
   - Go to **Settings → AI** in the admin sidebar
   - Paste your OpenAI API key
   - Click Save

2. Editors will see an **AI sparkle icon ✨** in the article editor toolbar

3. They can highlight text and ask AI to rewrite, summarize, or expand it

Requires an OpenAI API key from `https://platform.openai.com/api-keys`.
Strapi AI does NOT use MCP — it's a separate built-in feature.

### Option 2: Claude Code + MCP with OpenAI

If you prefer using **Claude Code** (our MCP setup) with OpenAI models instead
of Anthropic's Claude, configure your Claude Code to use the OpenAI-compatible
endpoint:

```bash
# In ~/.claude.json project config
{
  "mcpServers": {
    "stravyasta-sse": {
      "type": "http",
      "url": "http://localhost:3001/mcp/events",
      "headers": {
        "x-mcp-secret": "your-secret"
      }
    }
  }
}
```

Then set Claude Code to use OpenAI:
```bash
export ANTHROPIC_BASE_URL=https://api.openai.com/v1
export ANTHROPIC_API_KEY=sk-your-openai-key
claude
```

### Option 3: Custom AI Agent (Advanced)

Your OpenAI key can power a custom AI pipeline that uses Strapi MCP tools:

```bash
# Example: Python script using OpenAI + MCP
# 1. Generate article content with GPT-4
# 2. Create it in Strapi via MCP

curl -X POST "http://localhost:3001/mcp/messages?sessionId=auto" \
  -H "Content-Type: application/json" \
  -H "x-mcp-secret: your-secret" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_content_entry",
      "arguments": {
        "uid": "api::article.article",
        "data": {
          "title": "AI-Generated Article",
          "body": "Content generated by GPT-4..."
        }
      }
    }
  }'
```

### Comparison: Which AI to Use

| Feature | Strapi AI (OpenAI key) | Claude Code + MCP |
|---|---|---|
| **Access** | Inside Strapi admin panel | Terminal / VS Code / custom scripts |
| **Content generation** | ✅ Write articles | ✅ Via tool calls |
| **Content management** | ❌ Read/edit existing | ✅ Full CRUD + publish |
| **Schema introspection** | ❌ | ✅ Inspect content types |
| **System health checks** | ❌ | ✅ Run audits |
| **Batch operations** | ❌ | ✅ Create/update/publish in bulk |
| **Cost** | Uses your OpenAI key | Free (MCP open standard) |
| **Use case** | Editors writing content | Developers, automation, AI agents |
