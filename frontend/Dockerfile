# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
# --mount=type=cache: pnpm store를 호스트에 캐시 → package.json이 바뀌어도 재다운로드 없음
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source
COPY . .

# --- Development ---
FROM base AS dev
EXPOSE 13000
CMD ["pnpm", "dev"]

# --- Production build ---
FROM base AS build
RUN pnpm build

FROM node:20-alpine AS prod
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 13000
ENV PORT=13000
CMD ["node", "server.js"]
