# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV CI=true
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set confirmModulesPurge false
WORKDIR /app

# Install dependencies
# --mount=type=cache: pnpm store를 호스트에 캐시 → package.json이 바뀌어도 재다운로드 없음
# --mount=type=secret: GITHUB_TOKEN을 레이어에 남기지 않고 @jwonp/design-system 인증에 사용
COPY package.json pnpm-lock.yaml* .npmrc patches* ./
RUN --mount=type=secret,id=GITHUB_TOKEN \
    --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    GITHUB_TOKEN=$(cat /run/secrets/GITHUB_TOKEN 2>/dev/null || echo "") \
    pnpm install --frozen-lockfile

# Copy source
COPY . .

# --- Development ---
FROM base AS dev
CMD ["pnpm", "dev"]

# --- Production build ---
FROM base AS build
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN pnpm build

FROM node:20-alpine AS prod
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
CMD ["node", "server.js"]
