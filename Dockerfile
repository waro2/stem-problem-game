# STEM Problem Game — multi-stage Dockerfile
# Shared `base` stage installs dependencies and generates the Prisma
# client; `frontend` and `server` are dev-mode runtime targets selected
# via `build.target` in docker-compose.yml.

FROM node:20-alpine AS base
WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# ── Frontend: Vite dev server ──────────────────────────────────────
FROM base AS frontend
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Backend: Express API server (dev) ──────────────────────────────
FROM base AS server
EXPOSE 3001
CMD ["npm", "run", "server:dev"]

# ── Production API server (Railway) ────────────────────────────────
# Runs pending migrations before starting so each deploy is self-contained.
# Use additive-only migrations (never drop/rename columns while the app is live).
FROM base AS server-prod
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/server/index.ts"]
