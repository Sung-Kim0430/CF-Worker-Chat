import test from "node:test";
import assert from "node:assert/strict";
import * as app from "../public/app.js";

test("formatModelLabel adds clear speed and cost hints", () => {
  assert.equal(
    app.formatModelLabel({
      label: "GLM-4.7-Flash",
      speedTag: "Fast",
      costTag: "Balanced",
    }),
    "GLM-4.7-Flash · Fast · Balanced",
  );
});

test("normalizeStarterPrompt returns button-safe text for structured prompt cards", () => {
  assert.equal(typeof app.normalizeStarterPrompt, "function");

  const normalized = app.normalizeStarterPrompt(
    {
      title: "售前演示",
      description: "生成一段适合客户沟通的产品介绍",
      prompt: "帮我写一段适合售前演示的产品介绍文案。",
    },
    0,
  );

  assert.deepEqual(normalized, {
    title: "售前演示",
    description: "生成一段适合客户沟通的产品介绍",
    prompt: "帮我写一段适合售前演示的产品介绍文案。",
  });
});

test("normalizeStarterPrompt keeps legacy string prompts compatible", () => {
  assert.equal(typeof app.normalizeStarterPrompt, "function");

  const normalized = app.normalizeStarterPrompt(
    "请用简洁的方式介绍一下这个产品能帮客户解决什么问题。",
    1,
  );

  assert.deepEqual(normalized, {
    title: "示例 2",
    description: "请用简洁的方式介绍一下这个产品能帮客户解决什么问题。",
    prompt: "请用简洁的方式介绍一下这个产品能帮客户解决什么问题。",
  });
});
