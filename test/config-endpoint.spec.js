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
