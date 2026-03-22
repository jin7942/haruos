FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/tenant-web/package.json apps/tenant-web/
RUN pnpm install --frozen-lockfile
COPY packages/shared-types/ packages/shared-types/
COPY apps/tenant-web/ apps/tenant-web/
RUN pnpm --filter @haruos/shared-types build
RUN pnpm --filter @haruos/tenant-web build

FROM nginx:alpine
COPY --from=builder /app/apps/tenant-web/dist /usr/share/nginx/html
COPY infra/docker/nginx/tenant.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
