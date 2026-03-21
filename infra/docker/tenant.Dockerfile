FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/tenant-api/package.json apps/tenant-api/
COPY apps/tenant-web/package.json apps/tenant-web/
RUN pnpm install --frozen-lockfile
COPY packages/shared-types/ packages/shared-types/
COPY apps/tenant-api/ apps/tenant-api/
COPY apps/tenant-web/ apps/tenant-web/
RUN pnpm --filter @haruos/shared-types build
RUN pnpm --filter @haruos/tenant-api build
RUN pnpm --filter @haruos/tenant-web build

FROM node:22-alpine
RUN apk add --no-cache nginx
WORKDIR /app
COPY --from=builder /app/apps/tenant-api/dist ./dist
COPY --from=builder /app/apps/tenant-api/node_modules ./node_modules
COPY --from=builder /app/apps/tenant-api/package.json ./
COPY --from=builder /app/apps/tenant-web/dist /usr/share/nginx/html
EXPOSE 80 3000
CMD ["sh", "-c", "nginx && node dist/main"]
