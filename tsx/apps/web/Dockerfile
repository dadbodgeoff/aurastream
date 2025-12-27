# Streamer Studio Web - Multi-Stage Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies Stage
FROM base AS deps
COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/ui/package*.json ./packages/ui/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/api-client/package*.json ./packages/api-client/
RUN npm install

# Copy source after install for better caching
COPY . .

# Development Stage
FROM base AS dev
COPY --from=deps /app /app
WORKDIR /app/apps/web
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npx", "next", "dev", "-H", "0.0.0.0"]

# Builder Stage
FROM base AS builder
COPY --from=deps /app /app
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production Stage
FROM base AS prod
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
WORKDIR /app/apps/web
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
