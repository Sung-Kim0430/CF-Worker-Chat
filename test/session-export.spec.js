import test from "node:test";
import assert from "node:assert/strict";
import { buildSessionExport } from "../public/lib/session-export.js";

test("Markdown export preserves content and turn model labels while excluding transient errors", () => {
  const exported = buildSessionExport({
    title: "代码 / 方案", modelId: "@cf/zai-org/glm-4.7-flash",
    history: [
      { role: "user", content: "写代码" },
      { role: "assistant", content: "```js\nconst x = 1;\n```", modelLabel: "Gemma 4" },
      { role: "assistant", content: "请求未完成", includeInHistory: false },
    ],
  });
  assert.equal(exported.filename, "代码-方案.md");
  assert.match(exported.content, /### 你\n\n写代码/);
  assert.match(exported.content, /### Gemma 4/);
  assert.match(exported.content, /```js\nconst x = 1;\n```/);
  assert.doesNotMatch(exported.content, /请求未完成/);
});
