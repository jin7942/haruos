FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/tenant-api/package.json apps/tenant-api/
RUN pnpm install --frozen-lockfile
COPY packages/shared-types/ packages/shared-types/
COPY apps/tenant-api/ apps/tenant-api/
RUN pnpm --filter @haruos/shared-types build
RUN pnpm --filter @haruos/tenant-api build
RUN pnpm --filter @haruos/tenant-api deploy --legacy /prod

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /prod/dist ./dist
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
