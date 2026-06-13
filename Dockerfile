# syntax=docker/dockerfile:1

# ── Stage 1: Build ──────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN apk update && apk add --no-cache \
    build-base gcc autoconf automake libtool \
    zlib-dev libpng-dev nasm bash make

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm i -g corepack@latest && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
RUN pnpm build

# Prune dev dependencies for smaller runtime
ENV CI=true
RUN pnpm prune --prod

# ── Stage 2: Runtime ────────────────────────────────────────────────
FROM node:22-alpine
RUN apk add --no-cache vips-dev openssl wget
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm i -g corepack@latest && corepack enable

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/config ./config
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./
COPY --from=build /app/scripts ./scripts

ENV NODE_ENV=production
EXPOSE 1337

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:1337/api/health/live || exit 1

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
