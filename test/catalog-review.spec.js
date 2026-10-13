import test from "node:test";
import assert from "node:assert/strict";
import { parseOfficialModelCatalog, parseActiveModelVariants, compareModelCatalog } from "../scripts/lib/catalog-review.js";

test("official catalog parser extracts model cards, not navigation or compare duplicates", () => {
  const models = parseOfficialModelCatalog('<div data-models-cell data-name="@cf/a/chat" data-facet-tasks="Text Generation" data-facet-capabilities="Reasoning|Vision" data-model-id="@cf/a/chat"><div data-model-id="@cf/a/chat"></div><div data-models-cell data-facet-tasks="Text Embeddings" data-model-id="@cf/a/embed">');
  assert.equal(models.length, 2);
  assert.equal(models[0].id, "@cf/a/chat");
  assert.equal(models[0].task, "Text Generation");
  assert.deepEqual(models[0].capabilities, ["Reasoning", "Vision"]);
  assert.throws(() => parseOfficialModelCatalog("unexpected markup"), /model cards/);
});

test("catalog review recognizes explicitly active variants and flags missing IDs", () => {
  const variants = parseActiveModelVariants('#### Models deprecated\n- `@cf/a/old`\n#### Variants that remain active\n- `@cf/a/chat-fast`\n## Next section\n- `@cf/a/other`');
  assert.deepEqual(variants, ["@cf/a/chat-fast"]);
  const result = compareModelCatalog([
    { id: "@cf/a/chat", task: "Text Generation" },
    { id: "@cf/a/new", task: "Text Generation" },
    { id: "@cf/a/embed", task: "Text Embeddings" },
  ], [{ id: "@cf/a/chat" }, { id: "@cf/a/chat-fast" }, { id: "@cf/a/old" }], variants);
  assert.deepEqual(result.missingModelIds, ["@cf/a/old"]);
  assert.deepEqual(result.activeVariantIds, ["@cf/a/chat-fast"]);
  assert.deepEqual(result.newTextGenerationModelIds, ["@cf/a/new"]);
});
