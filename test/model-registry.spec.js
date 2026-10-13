import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MODEL,
  getFeaturedModels,
  getModelCatalog,
  getModelById,
} from "../src/lib/models.js";

test("featured model set stays compact and includes the default model", () => {
  const featured = getFeaturedModels();

  assert.ok(featured.length >= 4);
  assert.ok(featured.length <= 5);
  assert.equal(featured.some((model) => model.id === DEFAULT_MODEL), true);
  assert.equal(featured.every((model) => model.featured === true), true);
});

test("model registry exposes richer chat metadata for supported Workers AI models", () => {
  const glm = getModelById("@cf/zai-org/glm-4.7-flash");
  const gptOss = getModelById("@cf/openai/gpt-oss-120b");
  const qwen = getModelById("@cf/qwen/qwen3-30b-a3b-fp8");

  assert.equal(glm?.supportsStreaming, true);
  assert.equal(glm?.supportsFunctionCalling, true);
  assert.equal(glm?.taskType, "chat");

  assert.equal(gptOss?.supportsReasoning, true);
  assert.equal(gptOss?.taskType, "chat");
  assert.ok(["messages", "responses", "hybrid"].includes(gptOss?.inputMode || ""));

  assert.equal(qwen?.supportsFunctionCalling, true);
  assert.equal(qwen?.provider, "Qwen");
});

test("model catalog keeps more models available than the featured picker", () => {
  const catalog = getModelCatalog();

  assert.ok(catalog.length >= 17);
  assert.equal(
    catalog.some((model) => model.id === "@cf/meta/llama-4-scout-17b-16e-instruct"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/nvidia/nemotron-3-120b-a12b"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/google/gemma-4-26b-a4b-it"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/mistralai/mistral-small-3.1-24b-instruct"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/qwen/qwq-32b"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/moonshotai/kimi-k2.6"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/ibm-granite/granite-4.0-h-micro"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/qwen/qwen2.5-coder-32b-instruct"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/meta/llama-3.2-3b-instruct"),
    true,
  );
  assert.equal(
    catalog.some((model) => model.id === "@cf/meta/llama-3.2-1b-instruct"),
    true,
  );
});

test("catalog includes verified current chat models and rejects deprecated identifiers", () => {
  for (const id of [
    "@cf/zai-org/glm-5.2", "@cf/zai-org/glm-5.3", "@cf/zai-org/glm-5.3-flash",
    "@cf/moonshotai/kimi-k2.7-code", "@cf/deepseek-ai/deepseek-v4-flash-0731",
    "@cf/deepseek-ai/deepseek-v4-pro-0813", "@cf/qwen/qwen3.8-27b",
  ]) {
    const model = getModelById(id);
    assert.ok(model, id);
    assert.equal(model.inputMode, "messages");
    assert.equal(model.supportsStreaming, true);
    assert.ok(model.contextWindow >= 262144);
  }
  assert.equal(getModelById("@cf/google/gemma-3-12b-it"), null);
  assert.equal(getModelById("@cf/moonshotai/kimi-k2.5"), null);
  assert.equal(getModelById("@cf/zai-org/glm-5.3")?.requiresPaidAccess, true);
  assert.equal(getModelById(DEFAULT_MODEL)?.requiresPaidAccess, false);
  assert.ok(getModelById("@cf/meta/llama-3.1-8b-instruct-fast"));
});
