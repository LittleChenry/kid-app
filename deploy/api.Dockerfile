FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api-server/package.json packages/api-server/
RUN pnpm install
COPY . .
RUN pnpm -r build
RUN pnpm --filter @kid-app/api-server exec prisma generate

FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api-server/dist ./packages/api-server/dist
COPY --from=builder /app/packages/api-server/prisma ./packages/api-server/prisma
COPY --from=builder /app/packages/api-server/node_modules/.prisma ./packages/api-server/node_modules/.prisma
COPY --from=builder /app/packages/api-server/package.json ./packages/api-server/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "packages/api-server/dist/main.js"]
