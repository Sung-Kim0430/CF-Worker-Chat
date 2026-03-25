import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MODEL,
  getFeaturedModels,
  getEnabledModels,
  isSupportedModel,
} from "../src/lib/models.js";

test("GLM-4.7-Flash is the default enabled model", () => {
  assert.equal(DEFAULT_MODEL, "@cf/zai-org/glm-4.7-flash");
  assert.equal(isSupportedModel(DEFAULT_MODEL), true);
  assert.ok(getEnabledModels().length >= 17);
  assert.ok(getFeaturedModels().length >= 4);
});
