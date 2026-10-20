
# Base
FROM node:24.21.0-alpine AS base

# Development Deps
FROM base AS dev-deps
WORKDIR /app
COPY package* .
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production Deps
FROM base AS prod-deps
WORKDIR /app
COPY package* .
RUN npm ci --omit=dev

# Runner
FROM base AS runner
LABEL org.opencontainers.image.source="https://github.com/izeta8/kalaka"
ENV NODE_ENV="production"
WORKDIR /opt/backend

# Copy codebase
COPY --from=builder /app/dist ./ 
# Copy production node_modules
COPY --from=prod-deps /app ./
# Copy migrations
COPY migrations ./migrations

EXPOSE 3000
USER node:node
CMD [ "node", "./src/server.js" ]