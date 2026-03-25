# CF Worker Chat

一个基于 Cloudflare Workers AI 的多模型聊天应用，默认适配 `GLM-4.7-Flash`，同时保留扩展更多聊天模型的能力。项目重点不是“最小 demo”，而是更接近可直接演示给客户的产品雏形：它现在更像一个 balanced workspace，而不是一个只有输入框和消息列表的简单聊天页。

## 特性

- 默认模型为 `@cf/zai-org/glm-4.7-flash`
- 支持多模型切换，当前内置 3 个 Workers AI 聊天模型
- Worker 内通过 `env.AI.run(...)` 直接调用 Workers AI
- 提供 `/api/config` 运行时配置接口，前端可按配置渲染标题、模型和推荐问题
- 提供更清晰的 balanced workspace 布局：顶部工作台概览、会话摘要区、对话区和操作侧栏分工明确
- 流式响应体验更平滑，适合售前演示、客服问答和知识问答场景
- 中断后的部分回答会被保留，瞬时失败不会污染下一轮上下文
- 每轮助手消息会明确标出发起时模型，避免在演示时出现“这段回答到底是谁生成的”这类混淆
- 标准 Cloudflare Worker 工程结构，便于继续扩展鉴权、日志、持久化和知识库能力

## Balanced Workspace 体验

当前前端不再把所有信息都堆在同一块区域里，而是拆成更适合客户演示和操作说明的几个层次：

- `workspace header`
  展示当前产品定位和 runtime badges，例如 Streaming、GLM Ready、Multi-Model。
- `session summary`
  在消息区上方显示当前模型、会话阶段、上下文条目数和历史策略，方便用户快速确认“现在是什么状态”。
- `conversation desk`
  聚焦当前问答内容，保留对流式生成、中断提示和 Markdown 输出的支持。
- `operator rail`
  放置模型选择、模型说明、推荐提问和操作提示，减少主对话区的干扰。

这套 balanced workspace 设计的核心目的，是降低客户演示时的几个常见痛点：模型归属不清、状态变化不明显、失败信息污染后续上下文，以及移动端信息层级过于拥挤。

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
│  ├─ lib/
│  │  ├─ chat-flow.js
│  │  └─ ui-state.js
│  ├─ styles.css
│  └─ app.js
├─ scripts/
│  └─ dev.js
├─ src/
│  ├─ worker.js
│  └─ lib/
│     ├─ chat.js
│     ├─ dev-chat.js
│     ├─ http.js
│     ├─ models.js
│     └─ static.js
├─ test/
│  ├─ chat-route.spec.js
│  ├─ chat-flow.spec.js
│  ├─ chat-validation.spec.js
│  ├─ config-endpoint.spec.js
│  ├─ frontend-state.spec.js
│  ├─ layout-contract.spec.js
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

浏览器侧逻辑也做了更清晰的拆分：

- `public/lib/chat-flow.js`
  负责 SSE block 解析、尾部 buffer 收口、请求历史过滤和失败保留逻辑。
- `public/lib/ui-state.js`
  负责控件禁用、会话状态文案和消息标签格式化。
- `public/app.js`
  只作为页面协调层，处理渲染、事件绑定和请求发起。

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
3. 启动本地 mock 开发环境：

```bash
npm run dev
```

这个模式的定位是“界面联调 + 交互验证”：

- `/api/config` 返回真实运行时配置
- `/api/chat` 在 `localhost` 下如果没有可用的远端 AI 推理能力，会自动回退为 mock SSE 流
- 这样即使你还没有登录 Cloudflare，或者当前环境不支持本地 AI 绑定，也能先验证 UI、会话流转和错误处理

如果你要验证真实 Workers AI 模型输出，请改用：

```bash
npm run dev:remote
```

这个模式会通过 Cloudflare 远端环境执行推理，因此需要你已经完成 Cloudflare 登录，并且账号具备 Workers AI 权限。

不建议直接手动运行 `wrangler dev`，因为项目额外封装了 `scripts/dev.js` 来固定 inspector 端口、隔离 Wrangler 配置目录并关闭 telemetry 上报，减少本地环境差异。

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

为了让本地开发更稳定，服务端还额外区分了两条路径：

- `localhost` / `127.0.0.1` 下，如果 AI 绑定缺失，或 Wrangler 只提供“存在但只能远端运行”的 AI 占位绑定，则 Worker 会返回 mock SSE 流
- 非本地环境仍然严格依赖真实 `env.AI.run(...)`，推理失败会返回结构化错误

这能避免演示型界面在本地环境因为绑定能力差异直接报 500/502。

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
- 你当前使用的是 `npm run dev` 还是 `npm run dev:remote`
- 当前 Cloudflare 账号是否具备 Workers AI 权限
- 选中的模型是否在当前账号或区域可用

如果你运行的是 `npm run dev`，本地聊天接口默认允许 mock 回退，这是为了优先验证前端交互链路；要验证真实模型，请切到 `npm run dev:remote`。

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
