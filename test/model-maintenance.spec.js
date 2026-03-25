import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("model maintenance guide documents the official Cloudflare review flow", () => {
  const guide = fs.readFileSync("docs/model-maintenance.md", "utf8");

  for (const phrase of [
    "https://developers.cloudflare.com/workers-ai/models/",
    "https://developers.cloudflare.com/workers-ai/platform/pricing/",
    "chat-capable",
    "常用模型",
    "更多模型",
    "保持整洁",
  ]) {
    assert.match(guide, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("check-model-catalog script returns a JSON registry summary", () => {
  const stdout = execFileSync(process.execPath, ["scripts/check-model-catalog.js", "--json"], {
    encoding: "utf8",
  });
  const payload = JSON.parse(stdout);

  assert.equal(payload.defaultModel, "@cf/zai-org/glm-4.7-flash");
  assert.ok(payload.featuredCount >= 4);
  assert.ok(payload.catalogCount >= 17);
  assert.equal(Array.isArray(payload.models), true);
  assert.equal(
    payload.models.some((model) => model.id === "@cf/openai/gpt-oss-120b"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/google/gemma-3-12b-it"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/mistralai/mistral-small-3.1-24b-instruct"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/qwen/qwq-32b"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/moonshotai/kimi-k2.5"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/ibm-granite/granite-4.0-h-micro"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/qwen/qwen2.5-coder-32b-instruct"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/meta/llama-3.2-3b-instruct"),
    true,
  );
  assert.equal(
    payload.models.some((model) => model.id === "@cf/meta/llama-3.2-1b-instruct"),
    true,
  );
  assert.equal(Array.isArray(payload.maintenanceChecklist), true);
  assert.equal(
    payload.maintenanceChecklist.some((item) => /chat-capable|聊天/.test(item)),
    true,
  );
});
