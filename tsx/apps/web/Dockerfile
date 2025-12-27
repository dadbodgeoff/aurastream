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

# Accept build args for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

# Production Stage
FROM base AS prod
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
WORKDIR /app
# Copy the entire standalone output (includes node_modules and server structure)
COPY --from=builder /app/apps/web/.next/standalone ./
# Copy static files to the correct location
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# Copy public files
COPY --from=builder /app/apps/web/public ./apps/web/public
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# server.js is at apps/web/server.js in monorepo standalone output
CMD ["node", "apps/web/server.js"]
