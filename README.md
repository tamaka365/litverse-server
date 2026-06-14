# Fastify template

基于 [Fastify](https://fastify.dev) 的现代 TypeScript 后端开发模板，内置多种常用插件和开发工具，支持模块化、类型安全、编程式 SQL 构建（Kysely + PostgreSQL 16）及严格的代码风格校验。

## ✨ 特性

- ⚡ 极速的 Fastify 框架（独立模式，无 fastify-cli）
- 🧱 TypeBox 类型推导 + 校验一体化
- 🔐 Helmet + CORS + Rate Limit 安全方案
- 📊 Kysely + PostgreSQL 16 支持
- 🔌 插件自动加载机制
- 🌲 日志和错误友好处理（`@fastify/sensible` + pino）
- 🛑 `close-with-grace` 优雅退出
- ✅ 严格类型、ESLint、Prettier 格式统一
- 🚀 支持 `tsx` 无需构建直接运行

## 环境依赖与准备

运行本项目需要以下开发与生产环境：
- **Node.js**: >= 20.x
- **包管理器**: `pnpm`
- **Docker & Docker Compose**: 用于本地快速拉起 PostgreSQL 数据库服务 (若本地环境已运行 PostgreSQL 16，亦可直接使用系统服务)。

---

## 本地开发环境搭建 (安装与配置)

### 1. 依赖项安装
```bash
# 安装项目依赖
pnpm install
```

### 2. 配置环境变量
在项目根目录下，复制配置文件模版并根据您的本地配置进行修改：
```bash
cp .env.example .env
```
主要环境变量说明：
- `NODE_ENV`: 运行环境 (`development` / `production` / `test`)
- `DATABASE_URL`: 数据库连接串，格式为 `postgres://<username>:<password>@<host>:<port>/<database>` (例：`postgres://litverse_user:litverse_password@127.0.0.1:5432/litverse_db`)
- `PORT`: 本地服务端口，默认 `3000`
- `JWT_SECRET`: 校验 JSON Web Token 使用的加盐密钥
- `COOKIE_NAME`: Session 状态缓存 cookie 字段名称

---

## 数据库配置与启动 (Docker)

项目根目录已提供配置好的 `docker-compose.yml` 数据库服务：

### 1. 启动本地 PostgreSQL 16 容器
```bash
# 启动数据库容器并在后台运行
docker compose up -d
```
启动后容器将以如下默认配置运行：
- **容器名称**: `litverse-postgres`
- **数据库服务端口**: `5432`
- **默认用户**: `litverse_user`
- **默认密码**: `litverse_password`
- **默认库名**: `litverse_db`

### 2. 停止或移除容器
```bash
# 停止容器运行
docker compose stop

# 停止并移除容器与卷
docker compose down -v
```

---

## 数据库表初始化与维护 (Migrations)

项目基于 Kysely 编程式 Query Builder 进行 SQL 操作，无需繁琐的 ORM，直接以 `.sql` 迁移脚本管理数据库结构。

### 1. 执行表结构初始化与迁移 (Migration)
```bash
# 自动读取并按时序执行 sql/ 目录下的所有迁移脚本
pnpm run db:create
```

### 2. 生成 TypeScript 类型声明
每次添加、更新 `sql/*.sql` 文件或修改表结构后，必须运行以下命令，重新根据数据库的实际结构生成 TypeScript 的类型定义：
```bash
pnpm run db:types
```
生成的类型声明将直接输出并合并至依赖链中，无需手动声明数据表接口。

### 3. 填充测试种子数据 (Seed)
在开发或测试阶段，可以使用以下命令为数据库装载基本的测试初始账号：
```bash
# 自动填充测试用户数据 (仅限开发环境)
pnpm run db:seed
```

---

## 启动与访问开发环境 (Dev)

### 1. 启动开发服务器
```bash
pnpm run dev
```
此命令将启用 `tsx watch` 动态监听文件变更。修改代码后无需手动重启，服务会自动热重载。

### 2. 访问 Swagger 交互式文档
为了保护接口安全，本模板中将 Swagger 配置为仅限开发环境访问（当检测到 `NODE_ENV=development` 时加载插件）。
- **启动 dev 模式后**，在浏览器中打开以下链接即可浏览并调试 API：
  👉 **[http://localhost:3000/documentation](http://localhost:3000/documentation)**
- 在运行 `pnpm start` (生产环境) 时，该地址将不可访问，路由自动失效。

---

## 规范与开发指南

为了保持代码质量和一致性，本项目遵循严格的编码规范和 API 设计准则。

👉 **详细的技术规范、架构设计和项目目录结构请参考：[AGENTS.md](./AGENTS.md)**

### 核心要点简述
- **API 风格**: 遵循 RESTful 语义与 GitHub API 响应风格。
- **数据库**: 使用 Kysely + Repository 模式。
- **校验**: 全程 TypeBox 类型安全保障。
- **命名**: 路由使用 kebab-case，SQL 文件带三位编号。

---

## 推荐依赖（未预安装，可按需引入）

以下是一些在实际开发中常用且优秀的插件和工具库：

| 包名                                                                             | 说明                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------- |
| [`@fastify/auth`](https://github.com/fastify/fastify-auth)                       | 多重认证策略支持，可组合多个鉴权方案              |
| [`@fastify/jwt`](https://github.com/fastify/fastify-jwt)                         | JWT 签发与验证插件，适合构建登录系统或 API 鉴权   |
| [`@fastify/cookie`](https://github.com/fastify/fastify-cookie)                   | 用于处理 HTTP Cookie，配合认证或 session 常用     |
| [`@fastify/session`](https://github.com/fastify/session)                         | 基于 Cookie 的会话管理插件                        |
| [`@fastify/multipart`](https://github.com/fastify/fastify-multipart)             | 支持文件上传，支持多文件、流式传输                |
| [`@fastify/static`](https://github.com/fastify/fastify-static)                   | 静态文件服务，适合部署前端资源或文件下载          |
| [`@fastify/request-context`](https://github.com/fastify/fastify-request-context) | 不传 req 也能拿到本次请求数据，且并发不串台       |
| [`csv-stringify`](https://csv.js.org/stringify/)                                 | 将数据导出为 CSV 格式，适用于报表、数据导出等场景 |

> 这些依赖尚未包含在项目中，可根据实际需求通过 `pnpm add 包名` 安装使用。

---

## 安全防护

- 尽量使用 cloudflare 代理流量，并且在云服务提供商设置防火墙只允许 cf ip 访问
  - cloudflare ips https://www.cloudflare.com/zh-cn/ips/

---

## 测试与格式检查

### 1. 代码格式化与风格校验
```bash
# 检查格式差异
pnpm run format

# 自动修复格式
pnpm run format-fix

# 运行 ESLint 代码校验
pnpm run lint
```

### 2. 运行单元与集成测试
测试套件使用的是 Node.js 原生测试运行器。为防止在 PostgreSQL 数据库中并行操作数据导致状态冲突，测试默认进行单线程串行执行：
```bash
pnpm test
```
测试执行完成后，会在终端输出覆盖率汇总报告，并在本地生成 `/coverage/` 网页查看报告。


## 🤖 AI Coding Support

本项目已内置 AI coding 支持，适配常见开发工具与协作流程：

- **Codex** — 通过 `AGENTS.md` 约束项目规范与工作流
- **Claude Code** — 通过 `CLAUDE.md` 提供编码指引
- **Gemini CLI** — 通过 `AGENTS.md` 约束项目规范与工作流

建议在使用 AI 辅助开发前先阅读上述文件，确保输出符合项目规范。

[更多查看](https://www.yuque.com/pony13500815917/computer/xt0tdduk7mpt5bdf?singleDoc)

## 🚀 部署与更新指南 (Deployment & Updates)

本指南介绍如何在服务器生产环境中进行**全新部署**与**后续的版本更新**，包括数据库的操作。

### 1. 生产环境基础准备
- **Node.js**: >= 20.x
- **包管理器**: `pnpm`
- **PM2**: 用于生产环境下的进程守护及重启管理。
- **PostgreSQL 16**: 确保目标服务器已安装并运行 PostgreSQL 16 数据库服务。

### 2. 全新部署步骤
1. **本地构建与打包**：
   - 编译 TypeScript 源代码：`pnpm run build`
   - 准备发布包：`tar -czvf release.tar.gz dist/ package.json pnpm-lock.yaml sql/ scripts/` (包含打包后的 `dist`、环境配置、初始化数据库所需的迁移脚本与代码)
2. **上传发布包**：
   - 上传至生产服务器：`scp release.tar.gz 用户名@服务器IP:~/`
3. **服务器解包**：
   - 创建或进入项目部署目录：`cd /data/www/myapp`
   - 解压并覆盖当前目录：`tar -xzvf ~/release.tar.gz -C ./`
4. **依赖安装**：
   - 生产依赖安装：`pnpm install --frozen-lockfile --prod`
5. **环境配置**：
   - 复制生产环境变量：`cp .env.example .env` (按需修改 `.env` 中的 `DATABASE_URL`，指向生产 PostgreSQL 数据库，以及 `JWT_SECRET` 等机密配置)。
6. **数据库初始化**：
   - 在生产服务器上执行 `pnpm run db:create` 以自动加载 `sql/` 下的结构，建表及初始化生产数据库。
7. **启动服务**：
   - 使用 PM2 启动服务（入口文件为 `dist/server.js`）：`pm2 start dist/server.js --name "litverse-backend"`

---

### 3. 版本更新步骤 (带数据库更新)
当项目有新代码及数据库表结构变更（如新增了 `sql/00X-xxx.sql`）时，需遵循以下更新流程：

1. **本地环境构建**：
   - 本地开发验证完成后，运行 `pnpm run build`。
   - 压缩打包：`tar -czvf release.tar.gz dist/ package.json pnpm-lock.yaml sql/ scripts/`
2. **发布至服务器**：
   - 将 `release.tar.gz` 上传至目标服务器。
3. **部署覆盖**：
   - 进入服务器项目目录：`cd /data/www/myapp`
   - 解压覆盖：`tar -xzvf ~/release.tar.gz -C ./`
   - 更新生产依赖（如有新增库）：`pnpm install --frozen-lockfile --prod`
4. **更新数据库 Schema (核心步骤)**：
   - 运行：`pnpm run db:create` 
   - 该命令将自动在 PostgreSQL 数据库中追加并执行新上传的 `.sql` 脚本，更新数据库表结构。
5. **服务热重载**：
   - 使用 PM2 进行无缝平滑重载：`pm2 reload litverse-backend`

## ✅ Todo List

- [ ] 集成官方的 skill https://github.com/mcollina/skills