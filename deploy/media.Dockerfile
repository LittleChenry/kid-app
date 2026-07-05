FROM node:20-alpine AS builder
RUN apk add --no-cache ffmpeg
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/media-server/package.json packages/media-server/
RUN pnpm install
COPY . .
RUN pnpm -r build

FROM node:20-alpine
RUN apk add --no-cache ffmpeg cifs-utils
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/media-server/dist ./packages/media-server/dist
COPY --from=builder /app/packages/media-server/package.json ./packages/media-server/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4001
CMD ["node", "packages/media-server/dist/index.js"]
