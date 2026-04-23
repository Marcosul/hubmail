# Build context: apps/api (ex.: `fly deploy` neste diretório).
FROM node:20-bookworm-slim AS builder

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ENV DIRECT_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

COPY package.json ./
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm install
RUN npx prisma generate
RUN npx nest build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
