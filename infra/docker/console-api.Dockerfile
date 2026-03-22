FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY apps/console-api/package.json apps/console-api/
RUN pnpm install --frozen-lockfile
COPY packages/shared-types/ packages/shared-types/
COPY packages/shared-utils/ packages/shared-utils/
COPY apps/console-api/ apps/console-api/
RUN pnpm --filter @haruos/shared-types build
RUN pnpm --filter @haruos/shared-utils build
RUN pnpm --filter @haruos/console-api build
# pnpm deploy creates a self-contained directory with all dependencies
RUN pnpm --filter @haruos/console-api deploy /prod

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /prod/dist ./dist
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
