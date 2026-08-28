# ==========================================
# Multi-Stage Production Dockerfile
# Zikria Goods Transport Company ERP (Port 9050)
# ==========================================

# 1. Base image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# 2. Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci || npm install
RUN npx prisma generate

# 3. Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 4. Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9050
ENV HOSTNAME="0.0.0.0"

# Add a non-root system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets, prisma, seed, and standalone server output
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=deps /app/node_modules ./node_modules

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 9050

# Run entrypoint script (auto-migrates DB & starts Next.js)
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
