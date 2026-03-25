# Model Maintenance Guide

CF Worker Chat 的定位是一个**整洁、稳定、可维护的多模型 AI 对话站点**，不是把所有模型能力都堆到首页的 catalog dump。因此，每次迭代都应该把“模型扩展”当成固定检查项，而不是临时想到才做。

## Official Cloudflare references

在扩展模型前，先查官方文档：

- Workers AI overview: <https://developers.cloudflare.com/workers-ai/>
- Workers AI model catalog: <https://developers.cloudflare.com/workers-ai/models/>
- Workers AI pricing: <https://developers.cloudflare.com/workers-ai/platform/pricing/>

如果 Cloudflare 新增了可用于对话的模型，应优先评估这些 **chat-capable** / text-generation 模型是否适合当前站点的聊天工作流。

## Review checklist for future iterations

1. 先查看官方模型目录，确认是否出现新的 chat-capable 模型。
2. 优先选择能适配当前聊天接口的模型，尤其是支持 `messages`、streaming、函数调用或推理能力的模型。
3. 补齐 `src/lib/models.js` 中的元数据：
   - `provider`
   - `taskType`
   - `inputMode`
   - `supportsStreaming`
   - `supportsFunctionCalling`
   - `supportsReasoning`
4. 维持首页**保持整洁**：
   - 首页只保留 4-5 个“常用模型”
   - 其余模型收纳到“更多模型”面板
   - 不要因为模型数量增长就让主界面重新拥挤
5. 评估价格与体验：高成本模型不一定要放进常用模型，但可以保留在“更多模型”里供对比。
6. 更新 README、测试和维护脚本，确保下次迭代时仍能想起这件事。

## Local maintenance command

```bash
npm run check:models
```

这个命令会读取当前 registry，输出：

- default model
- featured / catalog 数量
- 当前收录的模型摘要
- 一份固定的模型维护 checklist

## Featured vs. full catalog policy

为了兼顾体验和扩展性，模型入口保持双层结构：

- **常用模型**：少量高频、默认推荐、可直接切换
- **更多模型**：完整目录，可搜索，可在不打扰主对话的前提下扩展

这个策略是为了避免两个常见问题：

1. 模型越来越多，首页越来越乱
2. 用户在真正聊天前，先被一长串模型名称劝退

## Validation before shipping

在新增或替换模型后，至少执行：

```bash
npm test
npm run check:models
npm run dev
```

如果 `wrangler dev` 在本地因为 watch 数量、端口占用或旧进程问题不够稳定，也建议补充执行：

```bash
npm run dev:ui
```

并手动确认：

- `/api/config` 能返回新的 featuredModels / modelCatalog
- `/api/health`（仅 `dev:ui`）能返回当前 preview 模式和模型数量
- 主界面仍然保持整洁
- 选中模型后，回答期间不会发生模型归属混乱
- 流式响应过程中不会重新闪烁整个页面
