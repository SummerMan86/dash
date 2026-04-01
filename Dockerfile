# Stage 1: Build
FROM node:20-alpine AS build

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Prune dev dependencies after build
RUN pnpm prune --prod
# Restore dotenv (needed by scripts/db.mjs at runtime)
RUN pnpm add dotenv

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/db ./db
COPY --from=build /app/scripts/db.mjs ./scripts/db.mjs

EXPOSE 3000

CMD ["node", "build/index.js"]
