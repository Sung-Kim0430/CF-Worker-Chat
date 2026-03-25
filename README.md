# CF Worker Chat

CF Worker Chat 是一个基于 Cloudflare Workers AI 的**多模型 AI 对话站点**。目标不是做一个只够演示的最小 demo，也不是个人主页式的“AI 入口”，而是做一个更接近 ChatGPT / Claude 使用习惯的聊天产品：打开就能对话，界面保持整洁，模型可扩展，流式响应稳定。

## 当前重点

- **外观**：聊天优先、干净克制，避免把所有信息同时堆到首页
- **稳定**：流式阶段只补丁更新最后一条 assistant 消息，减少闪烁
- **可维护**：模型通过 registry 管理，后续迭代可持续扩展更多 Workers AI 模型

## 特性

- 默认模型：`@cf/zai-org/glm-4.7-flash`
- 支持多模型 AI 对话，当前内置 17 个 Workers AI 聊天模型
- 首页只显示少量**常用模型**，完整目录通过**更多模型**面板展开
- Worker 通过 `env.AI.run(...)` 直接调用 Workers AI
- 运行时通过 `/api/config` 下发标题、模型目录、featuredModels 和 starter prompts
- `/api/chat` 支持流式响应和多轮上下文
- 流式生成时锁定模型，避免本轮回答中途切换造成归属混乱
- 中断后的部分回答会保留，但失败提示不会污染下一轮上下文
- 输入法组合阶段不会误触发 Enter 发送
- 样式层包含 `prefers-reduced-motion` 防护，兼顾稳定性与可访问性

## UI 结构

当前页面采用更接近真实聊天产品的双层结构：

- **顶部信息带**：展示站点标题、运行时 badges 和轻量说明
- **主对话区**：对话历史、会话状态、输入框和高频快捷动作
- **侧边控制区**：常用模型、更多模型目录、模型详情、快捷入口和使用提示

关键原则只有一条：**页面保持整洁**。因此模型入口被拆成两层：

- **常用模型**：4-5 个高频模型，直接切换
- **更多模型**：完整 catalog，可搜索，不挤占主对话区

## 当前模型目录

模型统一定义在 [`src/lib/models.js`](./src/lib/models.js)：

### 常用模型

- `@cf/zai-org/glm-4.7-flash`
- `@cf/meta/llama-3.1-8b-instruct-fast`
- `@cf/meta/llama-4-scout-17b-16e-instruct`
- `@cf/openai/gpt-oss-20b`
- `@cf/qwen/qwen3-30b-a3b-fp8`

### 更多模型

- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- `@cf/nvidia/nemotron-3-120b-a12b`
- `@cf/moonshotai/kimi-k2.5`
- `@cf/ibm-granite/granite-4.0-h-micro`
- `@cf/openai/gpt-oss-120b`
- `@cf/google/gemma-3-12b-it`
- `@cf/meta/llama-3.2-3b-instruct`
- `@cf/meta/llama-3.2-1b-instruct`
- `@cf/mistralai/mistral-small-3.1-24b-instruct`
- `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`
- `@cf/qwen/qwen2.5-coder-32b-instruct`
- `@cf/qwen/qwq-32b`

如果后续 Cloudflare 在官方目录里加入新的 **chat-capable** 模型，迭代时应该优先评估是否纳入 registry，而不是等用户再次提醒。

## 项目结构

```text
.
├─ public/
│  ├─ index.html
│  ├─ app.js
│  ├─ styles.css
│  └─ lib/
│     ├─ chat-flow.js
│     ├─ chat-render.js
│     └─ ui-state.js
├─ scripts/
│  ├─ check-model-catalog.js
│  └─ dev.js
├─ docs/
│  └─ model-maintenance.md
├─ src/
│  ├─ worker.js
│  └─ lib/
│     ├─ chat.js
│     ├─ dev-chat.js
│     ├─ http.js
│     ├─ models.js
│     └─ static.js
├─ test/
└─ wrangler.jsonc
```

## 运行原理

项目包含两个核心接口：

- `/api/config`
  - 返回前端运行所需的站点标题、副标题、defaultModel、`featuredModels`、`modelCatalog`、快捷入口和提示文案
- `/api/chat`
  - 接收用户消息、历史消息和所选模型，调用 Workers AI，并将 SSE 流式结果返回给前端

前端不会把模型写死在页面里，而是先读取 `/api/config`。这样以后新增模型或调整 featured 策略时，不需要把展示逻辑散落到多个地方。

## 本地开发

安装依赖：

```bash
npm install
```

启动本地联调环境：

```bash
npm run dev
```

这个模式下：

- `/api/config` 返回真实运行时配置
- `/api/chat` 在本地缺少有效 AI 推理能力时，会自动回退到 mock SSE 流
- 可以先联调 UI、会话流转、流式表现和错误处理

如果你当前更想确认“我看到的是不是这份最新前端”，或者本地 Wrangler 因 watch / 端口问题不够稳定，可以先使用：

```bash
npm run dev:ui
```

这个模式不依赖 Wrangler，会直接启动一个稳定的本地 UI preview，并提供：

- `/api/config`
- `/api/chat`（mock SSE）
- `/api/health`

适合做这些事：

- 确认你打开的是当前最新页面，而不是旧进程/旧缓存
- 检查“查看全部 17 个模型”与“还有 X 个模型”的前端入口是否已出现
- 验证聊天 UI、流式显示、空状态和交互细节

如果你要验证真实 Workers AI 输出，请改用：

```bash
npm run dev:remote
```

## Wrangler / Workers AI

当前项目通过 [`wrangler.jsonc`](./wrangler.jsonc) 配置：

- `main`: `src/worker.js`
- `ai.binding`: `AI`
- `assets.directory`: `./public`
- `assets.binding`: `ASSETS`

调用模型时使用官方推荐的 Workers AI binding 方式：

```js
await env.AI.run(modelId, {
  messages,
  stream: true,
});
```

## 测试与维护

运行自动化测试：

```bash
npm test
```

检查当前模型 registry 和维护清单：

```bash
npm run check:models
```

这个命令会输出：

- default model
- featured / catalog 数量
- 当前模型摘要
- 一份固定的模型维护 checklist

## 如何扩展更多模型

1. 先查看 Cloudflare 官方目录：<https://developers.cloudflare.com/workers-ai/models/>
2. 优先筛选适合聊天工作流的 **chat-capable** / text-generation 模型
3. 在 [`src/lib/models.js`](./src/lib/models.js) 中补充元数据
4. 评估是否进入“常用模型”，其余模型进入“更多模型”
5. 执行：

```bash
npm test
npm run check:models
npm run dev
```

6. 手工验证：
   - `/api/config` 是否包含新模型
   - `/api/chat` 是否仍然稳定流式返回
   - 页面是否仍然整洁，而不是因为模型增多变成拥挤 catalog

更详细的策略见 [`docs/model-maintenance.md`](./docs/model-maintenance.md)。

## 部署

部署到 Cloudflare：

```bash
npm run deploy
```

或：

```bash
wrangler deploy
```

## 常见问题

### 页面能打开，但不能聊天

优先检查：

- `wrangler.jsonc` 中是否已配置 `AI` binding
- 当前使用的是 `npm run dev` 还是 `npm run dev:remote`
- 账号是否具备 Workers AI 权限
- 当前选中的模型是否可用

### 我明明更新了代码，但前端还是旧的 3 模型页面

这通常不是当前代码没生效，而是你打开了旧页面或旧 dev 进程。建议按这个顺序排查：

1. 先运行 `npm run dev:ui`
2. 打开终端里打印出来的 URL
3. 检查页面是否出现：
   - `查看全部 17 个模型`
   - `还有 X 个模型：...`
4. 如果 `dev:ui` 是新的，而你之前页面不是，那就说明之前看的不是当前最新前端

### `/api/config` 正常，但 `/api/chat` 报错

这通常意味着：

- 请求格式无效
- 选中的模型不在当前白名单中
- Workers AI 推理过程失败

服务端会返回结构化错误，前端会把失败状态保留在当前轮次，而不会污染下一轮历史。

## 官方参考

- Workers AI overview: <https://developers.cloudflare.com/workers-ai/>
- Workers AI models: <https://developers.cloudflare.com/workers-ai/models/>
- Workers AI pricing: <https://developers.cloudflare.com/workers-ai/platform/pricing/>
- GLM-4.7-Flash: <https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/>
