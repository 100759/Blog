# Rin Blog - 中文说明

## 概述

Rin 是一个基于 Cloudflare 全家桶（Pages + Workers + D1 + R2）的现代无服务器博客程序。本项目基于 [openRin/Rin](https://github.com/openRin/Rin) 二次开发，保持了原版的所有特性，并在此基础上进行个性化调整。你只需将域名指向 Cloudflare，即可快速部署个人博客，无需管理任何服务器。

> **在线演示**：https://Blog.fuheng.vip（本项目部署实例）

## 功能

- **认证管理**：支持 GitHub OAuth 登录；首位注册用户自动成为管理员，后续用户为普通成员。
- **文章创作**：提供 Markdown 编辑器，支持实时自动保存草稿，不同文章自动隔离。
- **隐私控制**：文章可标记为“仅自己可见”，作为私人笔记或草稿，跨设备同步。
- **图片管理**：拖拽或粘贴图片即可上传至 S3 兼容存储（如 Cloudflare R2），自动生成链接。
- **自定义别名**：可为文章设置友好 URL（如 `https://yourblog.com/about`）。
- **不公开文章**：选择不在首页列表显示。
- **友情链接**：添加友链，系统每 20 分钟自动检查链接可用性。
- **评论系统**：支持回复和删除评论。
- **Webhook 通知**：收到新评论时可通过 Webhook 实时推送。
- **特色封面**：自动提取文章第一张图片作为列表封面。
- **标签解析**：输入 `#标签` 即可自动解析并展示。
- **类型安全**：前后端通过 `@rin/api` 包共享类型，端到端类型安全。
- **多语言**：支持简体中文、英文、日文等界面。
- …更多功能请访问演示站点探索。

## 技术栈

| 类别       | 技术                                                         |
| ---------- | ------------------------------------------------------------ |
| 前端       | React 18 + TypeScript + Tailwind CSS + Vite                  |
| 后端       | Cloudflare Workers (TypeScript)                              |
| 数据库     | Cloudflare D1 (SQLite)                                       |
| 存储       | Cloudflare R2 (S3 兼容)                                      |
| CI/CD      | GitHub Actions                                                |
| 运行时     | Bun (开发/构建) + Node.js (CI)                               |
| 其他       | i18next, react-markdown, mermaid, Monaco Editor 等           |

## 快速开始

### 前置条件

- 一个 Cloudflare 账号（免费版即可）
- 一个域名（需将 DNS 托管于 Cloudflare）
- 安装 [Bun](https://bun.sh) (>= 1.1)

### 1. 克隆仓库

```bash
git clone https://github.com/100759/Blog.git
cd Blog
```

### 2. 安装依赖

```bash
bun install
```

### 3. 配置环境变量

复制示例环境变量文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填写你的配置。关键字段说明见下方“环境变量”部分。

### 4. 启动开发服务器

```bash
bun run dev
```

前端开发服务器会启动在 `http://localhost:5173`，后端运行于 `http://localhost:11498`（可通过 `BACKEND_PORT` 调整）。

> **注意**：开发模式下需要本地 Cloudflare Worker 模拟环境，Bun 会自动处理。

### 5. 运行测试

```bash
# 运行所有测试
bun run test

# 仅测试客户端
bun run test:client

# 仅测试服务端
bun run test:server
```

## 环境变量

所有环境变量在 `.env.example` 中有详细注释。以下是核心必填项：

| 变量名               | 说明                                                         | 示例值                              |
| -------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `S3_ENDPOINT`        | S3 兼容存储的 endpoint（R2 的 endpoint）                     | `https://your-account.r2.cloudflarestorage.com` |
| `S3_ACCESS_HOST`     | 图片公开访问的域名（可以是自定义域名或 R2.dev 域名）         | `https://images.yourdomain.com`     |
| `S3_BUCKET`          | R2 存储桶名称                                                | `your-bucket`                       |
| `S3_ACCESS_KEY_ID`   | R2 访问密钥 ID（需在 Cloudflare 生成）                       | `your-access-key`                   |
| `S3_SECRET_ACCESS_KEY` | R2 秘密访问密钥                                              | `your-secret-key`                   |
| `JWT_SECRET`         | JWT 加密密钥，用于登录 token 签发（自行生成随机字符串）       | `your-jwt-secret`                   |
| `ADMIN_USERNAME`     | 管理员登录用户名（未配置 GitHub OAuth 时使用）               | `admin`                             |
| `ADMIN_PASSWORD`     | 管理员登录密码                                               | `your-password`                     |
| `RIN_GITHUB_CLIENT_ID` / `RIN_GITHUB_CLIENT_SECRET` | GitHub OAuth App 凭据（可选，建议使用） |                                     |

**可选变量**：`NAME`, `DESCRIPTION`, `AVATAR`, `PAGE_SIZE`, `RSS_ENABLE`, `WEBHOOK_URL` 等，可在部署后通过后台设置页面修改。

> **注意**：`CACHE_STORAGE_MODE` 默认为 `database`（使用 D1 存储缓存），也可设为 `s3`（使用 R2 缓存）。

## 常用脚本

| 命令                 | 说明                                                         |
| -------------------- | ------------------------------------------------------------ |
| `bun run dev`        | 启动本地开发环境（前端 + 后端）                               |
| `bun run build`      | 构建生产版本（前端 + 后端）                                   |
| `bun run deploy`     | 一键部署到 Cloudflare（需配置 Cloudflare API Token）          |
| `bun run check`      | 运行 TypeScript 类型检查                                       |
| `bun run format`     | 自动格式化代码（Prettier）                                    |
| `bun run test`       | 运行所有测试                                                   |
| `bun run test:coverage` | 运行测试并生成覆盖率报告                                      |

CLI 工具 `rin` 也提供子命令（如 `rin db migrate` 用于数据库迁移，`rin dev` 等），查看帮助 `bun run rin --help`。

## 一键部署到 Cloudflare

### 手动部署（本地执行）

确保已配置以下环境变量（或使用 `.env.local`）：

```bash
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id
```

然后运行：

```bash
bun run deploy
```

该命令会自动：
- 创建 D1 数据库（如果不存在）
- 构建前端并部署到 Cloudflare Pages
- 构建后端并部署到 Cloudflare Workers
- 运行数据库迁移
- 如果设置了 `R2_BUCKET_NAME`，会尝试自动关联 R2 存储

### 使用 GitHub Actions 持续部署

仓库包含多个 Actions workflow，推荐使用 `deploy.yml`。需要在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

**Secrets (必须)**：
- `CLOUDFLARE_API_TOKEN`：Cloudflare API 令牌（需 Worker、Pages、D1 权限）
- `CLOUDFLARE_ACCOUNT_ID`：你的 Cloudflare 账号 ID

**Secrets (可选)**：
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `RIN_GITHUB_CLIENT_ID`, `RIN_GITHUB_CLIENT_SECRET`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `JWT_SECRET`

**Variables (可选)**：
- `WORKER_NAME`, `DB_NAME`, `R2_BUCKET_NAME` 等资源名称
- `NAME`, `DESCRIPTION`, `AVATAR` 等站点初始配置

推送到 `main` 分支会自动触发构建并部署到生产环境。具体可参考 `.github/workflows/build.yml` 和 `.github/workflows/deploy.yml`。

## 项目结构

```
.
├── cli/                  # CLI 工具 (rin)
│   ├── bin/rin.ts        # 入口
│   └── src/              # 部署、迁移、开发等命令实现
├── client/               # 前端 (React)
│   ├── src/
│   │   ├── components/   # 通用组件
│   │   ├── page/         # 页面组件
│   │   ├── utils/        # 工具函数
│   │   └── ...
│   └── public/           # 静态资源
├── server/               # 后端 (Cloudflare Workers)
│   ├── src/
│   │   ├── _worker.ts    # Worker 入口
│   │   └── ...
│   └── sql/              # 数据库迁移脚本
├── docs/                 # 文档 (Rspress)
├── .github/              # GitHub Actions 配置
├── .env.example          # 环境变量示例
├── package.json          # 根包（workspace）
├── wrangler.toml         # Cloudflare Worker 配置（CI 生成）
└── tsconfig.base.json    # TypeScript 基础配置
```

## 维护注意事项

- **数据库迁移**：更新代码后，如果包含新的 SQL 迁移文件，部署时会自动执行。建议在部署前预览迁移：`bun run rin db migrate --dry-run`。
- **缓存模式**：`CACHE_STORAGE_MODE=database` 会将缓存存入 D1，适合无 R2 的简化部署；如果切换到 `s3`，务必确保 R2 存储已正确配置。
- **备份**：D1 数据库可在 Cloudflare 控制台导出快照。R2 中的数据建议定期异地备份。
- **升级**：如果 fork 了本项目，建议定期合并上游 openRin/Rin 的更新以获取新功能和修复。注意检查 `deploy-cf.ts` 等部署脚本的变更。
- **自定义域名**：部署后需在 Cloudflare Pages 或 Workers 中绑定自定义域名，否则只能使用 `*.workers.dev` 或 `*.pages.dev`。
- **评论系统**：评论数据直接存储在 D1，无需第三方服务。
- **Webhook**：可在设置页面配置 Webhook URL，用于新评论通知（如企业微信、Slack 等）。

## 社区与支持

- 上游项目文档：[https://docs.openrin.org](https://docs.openrin.org)
- 上游 Discord 社区：[邀请链接](https://discord.gg/JWbSTHvAPN)
- 本仓库 Issues：如有问题或建议，欢迎提交 Issue。

## 许可

MIT License，详见 [LICENSE](./LICENSE) 文件。