import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

test("GET /api/config returns default model and enabled model list", async () => {
  const response = await worker.fetch(new Request("https://app.test/api/config"), {
    ASSETS: {
      fetch: () => {
        throw new Error("not used");
      },
    },
  });

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.defaultModel, "@cf/zai-org/glm-4.7-flash");
  assert.ok(Array.isArray(body.models));
});

test("GET /api/config returns chat-site copy, badges and model picker metadata", async () => {
  const response = await worker.fetch(new Request("https://app.test/api/config"), {
    ASSETS: {
      fetch: () => {
        throw new Error("not used");
      },
    },
  });

  const body = await response.json();

  assert.equal(body.title, "CF Worker Chat");
  assert.match(body.subtitle, /多模型 AI 对话/);
  assert.ok(Array.isArray(body.workspaceBadges));
  assert.equal(typeof body.workspaceBadges[0]?.label, "string");
  assert.equal(typeof body.workspaceBadges[0]?.tone, "string");
  assert.equal(body.workspaceBadges.some((badge) => badge.label === "Multi-model"), true);
  assert.equal(typeof body.starterPrompts[0]?.title, "string");
  assert.equal(typeof body.starterPrompts[0]?.description, "string");
  assert.equal(typeof body.starterPrompts[0]?.prompt, "string");
  assert.equal(body.starterPrompts[0]?.title, "需求拆解");
  assert.ok(Array.isArray(body.featuredModels));
  assert.ok(Array.isArray(body.modelCatalog));
  assert.ok(body.modelCatalog.length > body.featuredModels.length);
  assert.equal(body.featuredModels.some((model) => model.id === body.defaultModel), true);
  assert.equal(body.modelPicker?.featuredLabel, "常用模型");
  assert.equal(body.modelPicker?.catalogLabel, "更多模型");
  assert.equal(typeof body.modelPicker?.searchPlaceholder, "string");
  assert.ok(Array.isArray(body.composerShortcuts));
  assert.equal(body.composerShortcuts[0]?.label, "拆解");
  assert.equal(typeof body.composerShortcuts[0]?.prompt, "string");
});
