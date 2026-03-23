# CF Worker Chat

一个基于 Cloudflare Workers AI 的多模型聊天应用，默认适配 `GLM-4.7-Flash`，同时保留扩展更多聊天模型的能力。项目重点不是“最小 demo”，而是更接近可直接演示给客户的产品雏形：界面更完整，流式体验更清晰，配置和代码结构也更适合后续维护。

## 特性

- 默认模型为 `@cf/zai-org/glm-4.7-flash`
- 支持多模型切换，当前内置 3 个 Workers AI 聊天模型
- Worker 内通过 `env.AI.run(...)` 直接调用 Workers AI
- 提供 `/api/config` 运行时配置接口，前端可按配置渲染标题、模型和推荐问题
- 流式响应体验更平滑，适合售前演示、客服问答和知识问答场景
- 标准 Cloudflare Worker 工程结构，便于继续扩展鉴权、日志、持久化和知识库能力

## 内置模型

当前默认和可选模型都在 [`src/lib/models.js`](./src/lib/models.js) 中统一管理：

- `@cf/zai-org/glm-4.7-flash`
- `@cf/meta/llama-3.1-8b-instruct-fast`
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

推荐策略：

- `GLM-4.7-Flash`：默认首选，适合通用演示和多轮对话
- `Llama 3.1 8B Fast`：更轻量，适合快速响应
- `Llama 3.3 70B Fast`：更强能力，适合更复杂的生成任务

如果你要支持更多模型，优先加入同样适合 `messages + stream: true` 交互模式的 Workers AI 模型，这样前后端逻辑可以保持一致。

## 目录结构

```text
.
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ src/
│  ├─ worker.js
│  └─ lib/
│     ├─ chat.js
│     ├─ http.js
│     ├─ models.js
│     └─ static.js
├─ test/
│  ├─ chat-route.spec.js
│  ├─ chat-validation.spec.js
│  ├─ config-endpoint.spec.js
│  ├─ frontend-state.spec.js
│  ├─ models.spec.js
│  ├─ project-structure.spec.js
│  └─ readme.spec.js
├─ package.json
└─ wrangler.jsonc
```

## 运行原理

项目包含两个核心接口：

- `/api/config`
  返回前端运行所需的标题、副标题、默认模型、模型列表和推荐问题

- `/api/chat`
  接收用户消息、历史消息和模型选择，调用 Workers AI 并把流式结果返回给前端

前端不会写死模型和标题，而是先请求 `/api/config`，再动态渲染页面。这能让你后续更容易做多场景复用。

## 前置要求

- Node.js 18 或更高版本
- 一个可用的 Cloudflare 账号
- 已开通 Workers AI 能力
- 本地已安装 npm

## 安装依赖

```bash
npm install
```

## 本地开发

1. 确认 [`wrangler.jsonc`](./wrangler.jsonc) 中已经声明 `AI` binding 和 `ASSETS`
2. 安装依赖
3. 启动本地开发环境：

```bash
npm run dev
```

或者直接使用：

```bash
wrangler dev
```

启动后访问 Wrangler 输出的本地地址。

## Wrangler 配置

当前项目通过 [`wrangler.jsonc`](./wrangler.jsonc) 定义 Worker 主入口和静态资源目录：

- `main`: `src/worker.js`
- `ai.binding`: `AI`
- `assets.directory`: `./public`
- `assets.binding`: `ASSETS`

这意味着：

- Worker 逻辑由 `src/worker.js` 处理
- HTML、CSS、JS 等静态资源由 `public/` 提供
- `/api/*` 路由由 Worker 优先处理，其余请求走静态资源

## Workers AI 绑定说明

本项目不再在 Worker 内手动拼接 Cloudflare REST API，而是使用 Workers AI 官方建议的绑定调用方式：

```js
await env.AI.run(modelId, {
  messages,
  stream: true,
});
```

这比手写鉴权和 SSE 代理更直接，也更适合后续扩展多个模型。

## 部署

部署到 Cloudflare：

```bash
npm run deploy
```

或者：

```bash
wrangler deploy
```

## 测试

运行所有自动化测试：

```bash
npm test
```

## 如何扩展更多模型

1. 打开 [`src/lib/models.js`](./src/lib/models.js)
2. 添加新的模型元数据：
   - `id`
   - `label`
   - `description`
   - `contextWindow`
   - `speedTag`
   - `costTag`
   - `recommendedFor`
   - `enabled`
3. 确认该模型适合当前聊天式 `messages` 调用方式
4. 本地运行 `npm test`
5. 用 `npm run dev` 手工验证模型切换和响应体验

## 常见问题

### 1. 页面能打开，但无法对话

优先检查：

- `AI` binding 是否已经在 `wrangler.jsonc` 中配置
- 当前 Cloudflare 账号是否具备 Workers AI 权限
- 选中的模型是否在当前账号或区域可用

### 2. `/api/config` 正常，但 `/api/chat` 报错

这通常表示：

- 请求格式无效
- 选中的模型不在白名单中
- Workers AI 推理过程失败

当前服务端会对这些错误做区分，并返回结构化错误信息。

### 3. 模型切换后回答风格不同

这是正常现象。不同模型在速度、成本和生成质量上的权衡不同，因此本项目会在 UI 中显示模型标签和推荐场景，帮助非技术用户理解差异。

## 成本与模型选择建议

Workers AI 的模型成本和能力差异明显。你可以结合 Cloudflare 官方定价页面和模型页选择合适模型：

- Workers AI 总览：<https://developers.cloudflare.com/workers-ai/>
- 定价：<https://developers.cloudflare.com/workers-ai/platform/pricing/>
- GLM-4.7-Flash：<https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/>

如果你的目标是客户演示，建议默认使用 `GLM-4.7-Flash`。如果你的目标是成本敏感型场景，可以优先尝试更轻量模型；如果更关注复杂生成质量，再切换到更强模型。
