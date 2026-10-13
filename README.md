# CF Worker Chat

CF Worker Chat 是一个基于 Cloudflare Workers AI 的**多模型 AI 对话站点**。目标不是做一个只够演示的最小 demo，也不是个人主页式的“AI 入口”，而是做一个更接近 ChatGPT / Claude 使用习惯的聊天产品：打开就能对话，界面保持整洁，模型可扩展，流式响应稳定。

## 当前重点

- **外观**：聊天优先、干净克制，避免把所有信息同时堆到首页
- **稳定**：流式阶段只补丁更新最后一条 assistant 消息，减少闪烁
- **可维护**：模型通过 registry 管理，后续迭代可持续扩展更多 Workers AI 模型

## 特性

- 默认模型：`@cf/zai-org/glm-4.7-flash`
- 支持多模型 AI 对话，当前内置 24 个 Workers AI 聊天模型
- 首页只显示少量**常用模型**，完整目录通过**更多模型**面板展开
- Worker 通过 `env.AI.run(...)` 直接调用 Workers AI
- 运行时通过 `/api/config` 下发标题、模型目录、featuredModels 和 starter prompts
- `/api/chat` 支持流式响应和多轮上下文
- 流式生成时锁定模型，避免本轮回答中途切换造成归属混乱
- 完成态 fenced code block 支持语言识别、高亮、行号与一键复制
- 中断后的部分回答会保留，但失败提示不会污染下一轮上下文
- 输入法组合阶段不会误触发 Enter 发送
- 外观支持跟随系统、浅色与深色切换，自动保存偏好，页面首次绘制前应用主题
- 生成中可以停止请求，保留部分回答并继续对话
- 会话菜单支持导出 Markdown，保留代码块与每轮模型归属
- 更多模型显示上下文规格、推理能力和付费访问要求
- 样式层包含 `prefers-reduced-motion` 防护，兼顾稳定性与可访问性

## UI 结构

当前页面采用简洁聊天工作台：

- **顶部模型栏**：对话记录开关、5 个常用模型和可搜索的更多模型面板
- **主对话区**：对话历史、当前模型提示、输入框和发送／停止生成
- **会话侧栏**：本地会话、搜索、重命名、Markdown 导出、外观选择与清空全部
- **移动端**：侧栏抽屉、可横向滚动的常用模型入口和紧凑输入区

关键原则只有一条：**页面保持整洁**。因此模型入口被拆成两层：

- **常用模型**：4-5 个高频模型，直接切换
- **更多模型**：完整 catalog，可搜索，不挤占主对话区

## 当前模型目录

模型统一定义在 [`src/lib/models.js`](./src/lib/models.js)：

核对日期：**2026-10-13**。目前 24 个模型，其中 5 个为常用入口。

### 常用模型

- `@cf/zai-org/glm-4.7-flash`
- `@cf/google/gemma-4-26b-a4b-it`
- `@cf/meta/llama-4-scout-17b-16e-instruct`
- `@cf/qwen/qwen3.8-27b`
- `@cf/openai/gpt-oss-20b`

### 更多模型

- `@cf/meta/llama-3.1-8b-instruct-fast`
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- `@cf/nvidia/nemotron-3-120b-a12b`
- `@cf/moonshotai/kimi-k2.6`（付费访问）
- `@cf/moonshotai/kimi-k2.7-code`（付费访问）
- `@cf/ibm-granite/granite-4.0-h-micro`
- `@cf/openai/gpt-oss-120b`
- `@cf/qwen/qwen3-30b-a3b-fp8`
- `@cf/qwen/qwen2.5-coder-32b-instruct`
- `@cf/meta/llama-3.2-3b-instruct`
- `@cf/meta/llama-3.2-1b-instruct`
- `@cf/mistralai/mistral-small-3.1-24b-instruct`
- `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`
- `@cf/qwen/qwq-32b`
- `@cf/zai-org/glm-5.2`（付费访问）
- `@cf/zai-org/glm-5.3`（付费访问）
- `@cf/zai-org/glm-5.3-flash`（付费访问）
- `@cf/deepseek-ai/deepseek-v4-flash-0731`（付费访问）
- `@cf/deepseek-ai/deepseek-v4-pro-0813`（付费访问）

Gemma 3 12B 与 Kimi K2.5 已移除。旧会话的不可用模型选择会回退到默认 GLM-4.7-Flash，历史内容保留。Llama 3.1 8B Fast 按官方公告中的仍活动变体保留。详情与官方来源见 [模型维护说明](./docs/model-maintenance.md)。

模型上下文为官方能力规格；本站每次请求携带最近 12 条历史消息，单条最多 12,000 字符。GLM 5 系列、Kimi K2.6 / K2.7 Code 和 DeepSeek V4 需要 Workers 付费计划或 AI Gateway 预付额度。本站目前提供文本聊天，模型的视觉／函数调用能力不代表本站已经实现图片输入或工具执行。

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
│     ├─ appearance.js
│     ├─ session-export.js
│     ├─ local-sessions.js
│     └─ ui-state.js
├─ scripts/
│  ├─ check-model-catalog.js
│  ├─ dev.js
│  └─ preview.js
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
- 检查顶部“更多模型”面板是否显示 `24 / 24`，搜索后是否更新结果数量
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

联网核对官方目录：

```bash
npm run check:models -- --online
npm run check:models -- --online --json
```

在线检查报告缺失模型、仍活动的目录例外及待评估的新文本模型；缺失模型、请求失败或页面格式不匹配会返回非零状态。新增建议仍须手工核对用途和参数，不会自动开放。

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

6. 手工验证浅色／深色、手机宽度、停止生成、Markdown 导出及：
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
   - 顶部 5 个常用模型
   - “更多模型”面板中的 `24 / 24`
   - 会话侧栏底部的外观选择
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
