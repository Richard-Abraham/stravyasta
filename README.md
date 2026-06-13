# Stravyasta

Production-grade **Strapi 5 CMS** with DDD module structure, **MCP (Model Context Protocol)** integration for AI agent access, multi-stage Docker builds, Redis caching, GraphQL, and CI/CD.

```
54 tests · 10 suites · All green
```

## Quick Start

```bash
git clone https://github.com/Richard-Abraham/stravyasta.git
cd stravyasta
pnpm install && pnpm develop
# Admin: http://localhost:1337/admin (admin@strapi.local / Str0ng!Admin#2026)
```

## Features

- **Content Management**: Articles, Pages, Categories, Tags, Navigation
- **AI-Ready**: MCP server with 6 tools (read + write) for LLM agents
- **Production Docker**: Multi-stage build (~400MB), PostgreSQL, Redis, S3
- **Security**: CSP headers, CORS, audit logging, rate limiting, UID allowlist
- **CI/CD**: GitHub Actions workflows for test + deploy
- **Testing**: 54 vitest tests across all modules

## Docs

- `INSTRUCTIONS.md` — Full setup, deployment, and usage guide
- `AGENTS.md` — Architecture decisions and feature checklist
- `NOTES.md` — Implementation log
- `AUDIT.md` — Security audit report

## Tech Stack

Strapi 5 · TypeScript · pnpm · PostgreSQL · Redis · Docker · GitHub Actions · MCP · GraphQL
