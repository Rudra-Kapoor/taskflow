# syntax=docker/dockerfile:1

# ---------- Build stage: install everything and build the React client ----------
FROM node:22-alpine AS build
WORKDIR /app

# The embedded test database is a dev-only dependency; skip its 600 MB binary download.
ENV MONGOMS_DISABLE_POSTINSTALL=1

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --include=dev --no-audit --no-fund

COPY client client
RUN npm run build -w client

# ---------- Runtime stage: production server dependencies + built client ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace=server --no-audit --no-fund && npm cache clean --force

COPY server/src server/src
COPY --from=build /app/client/dist client/dist

USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["node", "server/src/index.js"]
