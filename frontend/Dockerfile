FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8000/api/v1/stream
ARG NEXT_PUBLIC_TILE_SERVER_URL=http://localhost:8080
ARG NEXT_PUBLIC_USE_MOCK_TELEMETRY=false

RUN npm run build

FROM node:20-alpine AS runner

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]

CMD ["node", "server.js"]
