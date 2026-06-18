FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile
COPY src ./src
RUN touch .env

# 解决构建期没有运行中数据库导致类型丢失的问题，将静态生成的数据库定义拷入 node_modules 中
RUN cp src/types/db.d.ts node_modules/kysely-codegen/dist/db.d.ts
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install -g pnpm@9
COPY --from=builder /app ./
EXPOSE 3000
CMD ["node", "dist/server.js"]

