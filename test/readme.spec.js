import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("README documents setup, chat routes, models, and deployment", () => {
  const readme = fs.readFileSync("README.md", "utf8");

  for (const phrase of [
    "CF Worker Chat",
    "Workers AI",
    "npm run dev",
    "wrangler deploy",
    "/api/config",
    "/api/chat",
  ]) {
    assert.match(readme, new RegExp(phrase));
  }
});

test("README explains model maintenance and clean model-picker strategy", () => {
  const readme = fs.readFileSync("README.md", "utf8");

  assert.match(readme, /多模型 AI 对话|多模型聊天/);
  assert.match(readme, /常用模型/);
  assert.match(readme, /更多模型/);
  assert.match(readme, /workers-ai\/models\//i);
  assert.match(readme, /chat-capable|聊天模型/);
  assert.match(readme, /npm run check:models|check-model-catalog/);
});
