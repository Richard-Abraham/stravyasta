# Sattva Web — Frontend Architecture & Build Plan

## Overview

Production-grade **Next.js 16** frontend for Stravyasta (Strapi CMS). Fetches content from Strapi's REST API and renders it as a full-featured, competitive website matching the vyasta.sattva-ai.com design language.

**Separate repo:** `github.com/Richard-Abraham/sattva-web`
**Deploy target:** Dokploy (same as stravyasta)
**Stack:** Next.js 16 + shadcn/ui + Tailwind CSS v4 + TypeScript

---

## Why Build This?

Strapi is a **headless CMS** — it stores content and serves APIs but renders nothing visible to end users. The frontend is what your customers, users, and supervisor actually see.

**Without the frontend:** Strapi is just an admin panel with no public presence.
**With the frontend:** A fast, beautiful, competitive website powered by your content.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│  Dokploy      │     │  Dokploy      │     │  Dokploy       │
│  strapi-api   │     │  strapi-mcp   │     │  sattva-web    │
│  Port 1337    │     │  Port 3001    │     │  Port 3000     │
│  PostgreSQL   │     │  AI agents    │     │  Next.js 16    │
│  Redis        │     │               │     │  shadcn/ui     │
└──────┬───────┘     └───────────────┘     └───────┬────────┘
       │                                              │
       └────────────── REST API ──────────────────────┘
```

Three separate Dokploy projects, all connected via HTTP API.

---

## Three-Phase Build Plan

### Phase 1 — Foundation (Days 1–3)
**Goal:** Launchable site. All core features + visual identity.

| Day | Build |
|---|---|
| **1** | `npx create-next-app@latest sattva-web --typescript --tailwind` |
| | Install shadcn/ui (`npx shadcn@latest init`) |
| | Create `lib/strapi.ts` — unified API client |
| | Set up environment variables |
| **2** | Theme to match vyasta.sattva-ai.com (purple palette, typography) |
| | Build `Header` + `Footer` + `Navigation` (fetched from Strapi) |
| | Mobile responsive menu + dark mode toggle |
| **3** | Build Block Renderer + all 4 Dynamic Zone components: |
| | - `rich-text.tsx` — prose styled |
| | - `image-gallery.tsx` — grid + lightbox |
| | - `cta.tsx` — gradient card with button |
| | - `faq.tsx` — accordion |

### Phase 2 — Content Pages (Days 4–6)
**Goal:** Full content surface. All page types.

| Day | Build |
|---|---|
| **4** | Article listing with pagination + category/tag filter sidebar |
| | Article card component with cover image, title, excerpt, date |
| **5** | Single article page (`/articles/[slug]`) |
| | Render body + contentBlocks dynamic zone |
| | Related articles by shared category |
| | Breadcrumbs component |
| **6** | Generic page renderer (`/pages/[slug]`) |
| | Homepage as Strapi page with `slug: home` |
| | Custom 404 page |
| | Loading skeletons for all pages |

### Phase 3 — Competitive Edge (Days 7–10)
**Goal:** AI-powered, polished, production-grade.

| Day | Build |
|---|---|
| **7** | SEO: Dynamic OG images (`@vercel/og`) |
| | Sitemap.xml + robots.txt generation from Strapi routes |
| | RSS feed (`/rss.xml` from articles) |
| | Structured data (JSON-LD for articles) |
| **8** | AI Semantic Search: |
| | - Generate OpenAI embeddings on article publish |
| | - Store embeddings in Strapi (extension field) |
| | - Frontend search bar with semantic results |
| | Contact form → POST to Strapi API |
| | Newsletter email capture → stored in Strapi |
| **9** | Accessibility audit: aria labels, keyboard nav, skip-to-content |
| | Cookie consent banner (GDPR) |
| | Analytics (Plausible/Umami self-hosted) |
| | Lighthouse 90+ on all pages |
| **10** | Deploy on Dokploy as new project |
| | Custom domain + SSL |
| | CDN configuration |
| | Supervisor demo |

---

## Page Map

```
vyasta.sattva-ai.com (or custom domain)
│
├── /                               # Homepage
│   ├── Hero CTA section (Dynamic Zone)
│   ├── Featured articles (3 latest)
│   ├── About/rich text section
│   └── Final CTA
│
├── /articles                       # Article listing
│   ├── Filter by category / tags
│   ├── Paginated results
│   └── Per: 12 articles
│
├── /articles/[slug]                # Single article
│   ├── Cover image
│   ├── Title + author + date
│   ├── Rich text body
│   ├── Dynamic zone content blocks
│   ├── Related articles (same category)
│   └── Social share buttons
│
├── /pages/[slug]                   # Generic page
│   └── Full Dynamic Zone layout
│       (Rich Text, Image Gallery, CTA, FAQ)
│
├── /categories/[slug]              # Filtered listing
│   └── Articles in this category
│
├── /tags/[slug]                    # Filtered listing
│   └── Articles with this tag
│
├── /search                         # AI semantic search
│   └── Search bar + results
│
├── /contact                        # Contact form
│   └── Name, email, message → stored in Strapi
│
├── /rss.xml                        # RSS feed
├── /sitemap.xml                    # SEO sitemap
└── /robots.txt                     # Crawler rules
```

---

## Data Flow: Dynamic Zone → React Component

This is the core architectural pattern. Strapi returns mixed component arrays:

```json
// From GET /api/pages?populate=layout
{
  "layout": [
    { "__component": "shared.rich-text", "body": "<p>Hello</p>" },
    { "__component": "shared.image-gallery", "images": [...], "caption": "Gallery" },
    { "__component": "shared.cta", "title": "Learn More", "buttonUrl": "/about" },
    { "__component": "shared.faq", "question": "What is this?", "answer": "..." }
  ]
}
```

Frontend renders them via a block router:

```tsx
// components/blocks/block-renderer.tsx
const blockComponents = {
  'shared.rich-text': RichTextBlock,
  'shared.image-gallery': ImageGalleryBlock,
  'shared.cta': CtaBlock,
  'shared.faq': FaqBlock,
};

export function BlockRenderer({ blocks }) {
  return blocks?.map((block, i) => {
    const Component = blockComponents[block.__component];
    return Component ? <Component key={i} {...block} /> : null;
  });
}
```

---

## API Client Layer

```typescript
// lib/strapi.ts
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 }, // ISR
    ...options,
  });
  if (!res.ok) throw new Error(`Strapi API error: ${res.status}`);
  return res.json();
}

// ── Articles ──
export function getArticles(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return fetchAPI(`/articles${qs}&populate=*`);
}

export function getArticleBySlug(slug: string) {
  return fetchAPI(`/articles/slug/${slug}`);
}

export function getRelatedArticles(categoryId: number, excludeId: number) {
  return fetchAPI(`/articles?filters[category][id][$eq]=${categoryId}&filters[id][$ne]=${excludeId}&limit=3&populate=*`);
}

// ── Pages ──
export function getPageBySlug(slug: string) {
  return fetchAPI(`/pages?filters[slug][$eq]=${slug}&populate=layout.*,seo.*`);
}

export function getHomepage() {
  return getPageBySlug('home');
}

// ── Navigation ──
export function getNavigation() {
  return fetchAPI('/navigation?populate=items');
}

// ── Categories / Tags ──
export function getCategories() {
  return fetchAPI('/categories');
}

export function getTags() {
  return fetchAPI('/tags');
}

// ── Contact Form (write) ──
export function submitContact(data: { name: string; email: string; message: string }) {
  return fetchAPI('/contacts', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

// ── Search (AI semantic — Phase 3) ──
export function semanticSearch(query: string) {
  return fetchAPI(`/search?query=${encodeURIComponent(query)}`);
}
```

---

## Content Fetching Strategy

| Page | Strategy | Revalidation | Data Source |
|---|---|---|---|
| Homepage | ISR | 60s | Strapi Page with slug: home |
| Articles list | ISR | 60s | GET /api/articles |
| Single article | ISR + generateStaticParams | 60s | GET /api/articles/slug/[slug] |
| Generic page | ISR + generateStaticParams | 60s | GET /api/pages?filters[slug] |
| Search | Client-side | On demand | POST /api/search |
| Contact | Client POST | N/A | POST /api/contacts |

---

## Dynamic OG Images (Phase 3)

Each article gets a unique social card generated at request time:

```tsx
// app/articles/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export async function GET(request: Request, { params }) {
  const { data } = await getArticleBySlug(params.slug);
  return new ImageResponse(
    <div style={{ background: '#7C3AED', color: 'white', padding: 60, fontSize: 48 }}>
      {data.attributes.title}
    </div>,
    { width: 1200, height: 630 }
  );
}
```

---

## AI Semantic Search (Phase 3)

### How It Works

```
Article published in Strapi
        │
        ▼
Strapi bootstrap lifecycle generates OpenAI embedding
(1536-dimension vector of article title + excerpt)
        │
        ▼
Embedding stored in Strapi Article schema
        │
        ▼
User types search query on frontend
        │
        ▼
Frontend generates embedding of query via OpenAI API
        │
        ▼
Frontend calls Strapi custom endpoint:
  POST /api/search { embedding: [...] }
        │
        ▼
Strapi compares query embedding vs article embeddings
Returns top 10 most semantically similar articles
```

### What This Enables

Searching "modern web development" finds articles about "Next.js and React architecture" — even if those exact keywords don't match. Traditional keyword search would miss them.

### Requirements

- **OpenAI API key** (you have one)
- **Custom Strapi endpoint** (`/api/search`) — we already have the MCP infrastructure; this extends it
- **Embedding storage** — add a JSON field to Article content type

---

## Visual Design: vyasta.sattva-ai.com

We'll replicate the exact visual identity:

| Element | Target |
|---|---|
| **Primary color** | Purple (`#7C3AED` or extracted from live site) |
| **Secondary** | Extracted from site CSS variables |
| **Typography** | Inter / system sans-serif |
| **Component library** | shadcn/ui themed to match |
| **Layout** | Full-width sections, generous whitespace |
| **Navigation** | Top bar with dropdown, mobile hamburger |
| **Cards** | Rounded corners, shadow, hover effects |
| **CTAs** | Gradient backgrounds, pill buttons |
| **Dark mode** | Tailwind dark: variant matching site |

### Tailwind Theme Config (Example)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#a855f7',
          600: '#7C3AED',
          700: '#6d28d9',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

---

## Deployment

| App | Dokploy Project | Build Method | Env Variables |
|---|---|---|---|
| **Strapi CMS** | `stravyasta` | Dockerfile | DB creds, S3, Redis, MCP |
| **Frontend** | `sattva-web` | Dockerfile (Next.js standalone) | `NEXT_PUBLIC_STRAPI_URL` |

**Dokploy setup for frontend:**
1. New project → connect `Richard-Abraham/sattva-web` repo
2. Build: `next build`
3. Start: `node .next/standalone/server.js`
4. Port: `3000`
5. Env: `NEXT_PUBLIC_STRAPI_URL=https://cms.yourdomain.com`

**Dockerfile for Next.js (using standalone output):**

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/public ./public
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Repository

| Detail | Value |
|---|---|
| **Name** | `sattva-web` |
| **Host** | GitHub |
| **Account** | `Richard-Abraham` |
| **URL** | `https://github.com/Richard-Abraham/sattva-web` |
| **Branch protection** | Same as stravyasta (PR required for main) |

---

## Competitive Comparison

| Feature | Our Setup | Contentful | Sanity | Webflow |
|---|---|---|---|---|
| **Headless CMS** | ✅ Strapi | ✅ | ✅ | ❌ Locked |
| **Dynamic Zones** | ✅ 4 block types | via references | via blocks | ✅ Native |
| **MCP / AI Agent Access** | ✅ **Unique** | ❌ | ❌ | ❌ |
| **AI Semantic Search** | ✅ OpenAI embeddings | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ Your servers | ❌ SaaS | ❌ SaaS | ❌ SaaS |
| **Dark Mode** | ✅ | Varies | Varies | Limited |
| **ISR Performance** | ✅ 90+ Lighthouse | ✅ CDN | ✅ CDN | ⚠️ Slower |
| **SEO** | ✅ OG, sitemap, RSS, structured data | ✅ | ✅ | ✅ |
| **Accessibility** | ✅ 90+ a11y | Varies | Varies | ✅ |
| **Content Ownership** | ✅ Your DB + code | ❌ Platform | ❌ Platform | ❌ Platform |
| **Cost at Scale** | Your servers only | $300+/mo | $$$ API calls | $40+/mo |

## What We Need From You

| Item | Detail |
|---|---|
| **OpenAI API key** | For AI semantic search (Phase 3) |
| **Vyasta brand assets** | Logo SVG, brand colors (if different from what we extracted) |
| **Custom domain** | For the live frontend URL |
| **Dokploy access** | To create the sattva-web project |

---

## Next Steps After This Plan

1. Review and approve this plan
2. I'll create the `sattva-web` repo and scaffold Phase 1
3. Build Phase 1 → demo → Phase 2 → demo → Phase 3
4. Deploy live
