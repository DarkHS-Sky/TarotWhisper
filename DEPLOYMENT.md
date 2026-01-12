# Cloudflare 部署指南

本文档介绍如何将 TarotWhisper 部署到 Cloudflare Workers。

## 前置要求

1. **Cloudflare 账户**：注册 [Cloudflare](https://dash.cloudflare.com/sign-up)
2. **Node.js**：版本 18.x 或更高
3. **Wrangler CLI**：已包含在项目依赖中

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Static Assets  │    │     Edge Runtime (Worker)       │ │
│  │  (.open-next/   │    │  - Next.js App Router           │ │
│  │   assets/)      │    │  - API Routes (/api/chat)       │ │
│  │  - HTML/CSS/JS  │    │  - SSR Pages                    │ │
│  │  - Images       │    │  - Streaming SSE                │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 快速部署

### 1. 安装依赖

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器进行 OAuth 授权。

### 3. 配置环境变量

在 Cloudflare Dashboard 中配置以下环境变量（Settings > Variables）：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DEFAULT_LLM_ENABLED` | 是否启用默认 LLM（`true`/`false`） | 是 |
| `DEFAULT_LLM_BASE_URL` | LLM API 基础 URL | 是（如启用） |
| `DEFAULT_LLM_API_KEY` | LLM API 密钥 | 是（如启用） |
| `DEFAULT_LLM_MODEL` | 默认模型名称 | 否 |
| `NEXT_PUBLIC_DEFAULT_LLM_AVAILABLE` | 客户端是否显示默认选项 | 否 |
| `NEXT_PUBLIC_DEFAULT_LLM_MODEL` | 客户端显示的模型名称 | 否 |

**重要**：敏感信息（如 API 密钥）应在 Cloudflare Dashboard 中配置为加密变量，而非写入 `wrangler.jsonc`。

### 4. 构建并部署

```bash
# 构建 Cloudflare Workers 版本
npm run cf:build

# 部署到生产环境
npm run cf:deploy
```

部署成功后，会显示类似以下的 URL：
```
Published tarot-whisper (1.23 sec)
  https://tarot-whisper.your-subdomain.workers.dev
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地 Next.js 开发服务器 |
| `npm run cf:dev` | 本地 Cloudflare Workers 模拟环境 |
| `npm run cf:build` | 构建 Cloudflare Workers 版本 |
| `npm run cf:deploy` | 部署到生产环境 |
| `npm run cf:preview` | 部署到预览环境 |

## 配置文件说明

### wrangler.jsonc

Cloudflare Workers 配置文件：

```jsonc
{
  "name": "tarot-whisper",           // Worker 名称
  "main": ".open-next/worker.js",    // 入口文件
  "compatibility_date": "2024-12-01", // 兼容性日期
  "compatibility_flags": ["nodejs_compat"], // Node.js 兼容模式
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"  // 静态资源目录
  }
}
```

### open-next.config.ts

OpenNext 适配器配置，用于将 Next.js 转换为 Cloudflare Workers 格式。

## 自定义域名

### 方式一：通过 Cloudflare Dashboard

1. 进入 Workers & Pages > tarot-whisper
2. 点击 "Custom Domains"
3. 添加你的域名（需要在 Cloudflare DNS 中管理）

### 方式二：通过 wrangler.jsonc

```jsonc
{
  "routes": [
    { "pattern": "tarot.yourdomain.com", "custom_domain": true }
  ]
}
```

## 环境管理

### 预览环境

```bash
npm run cf:preview
```

这会部署到 `tarot-whisper-preview.your-subdomain.workers.dev`。

### 多环境配置

创建 `wrangler.preview.jsonc` 用于预览环境：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tarot-whisper-preview",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  },
  "vars": {
    "NEXTJS_ENV": "preview"
  }
}
```

## 故障排除

### 构建失败

1. 确保 Node.js 版本 >= 18
2. 清理缓存后重试：
   ```bash
   rm -rf .next .open-next node_modules
   npm install
   npm run cf:build
   ```

### API 路由不工作

确保 API 路由文件包含 Edge Runtime 声明：
```typescript
export const runtime = 'edge'
```

### 环境变量未生效

1. 检查 Cloudflare Dashboard 中的变量配置
2. 重新部署：`npm run cf:deploy`
3. 注意：`NEXT_PUBLIC_*` 变量在构建时嵌入，需要重新构建

### 流式响应问题

Cloudflare Workers 完全支持 SSE 流式响应。如果遇到问题：
1. 确保响应头正确设置
2. 检查 LLM API 是否正常返回流式数据

## 性能优化

### 启用缓存（可选）

如需启用增量静态再生成（ISR）缓存，可配置 KV 存储：

```jsonc
// wrangler.jsonc
{
  "kv_namespaces": [
    {
      "binding": "NEXT_INC_CACHE_KV",
      "id": "your_kv_namespace_id"
    }
  ]
}
```

### 图片优化（可选）

启用 Cloudflare 图片优化：

```jsonc
// wrangler.jsonc
{
  "images": {
    "binding": "IMAGES"
  }
}
```

同时修改 `next.config.ts`：
```typescript
const nextConfig: NextConfig = {
  images: {
    // 移除 unoptimized: true
    remotePatterns: [
      // 配置允许的图片源
    ],
  },
};
```

## 成本估算

Cloudflare Workers 免费套餐包含：
- 每天 100,000 次请求
- 每次请求 10ms CPU 时间

对于塔罗牌应用，免费套餐通常足够个人使用。

## 相关链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [OpenNext Cloudflare 适配器](https://github.com/opennextjs/opennextjs-cloudflare)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
