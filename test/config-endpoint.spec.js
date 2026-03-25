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

test("GET /api/config returns structured prompt cards and workspace badges", async () => {
  const response = await worker.fetch(new Request("https://app.test/api/config"), {
    ASSETS: {
      fetch: () => {
        throw new Error("not used");
      },
    },
  });

  const body = await response.json();

  assert.ok(Array.isArray(body.workspaceBadges));
  assert.equal(typeof body.workspaceBadges[0]?.label, "string");
  assert.equal(typeof body.workspaceBadges[0]?.tone, "string");
  assert.equal(typeof body.starterPrompts[0]?.title, "string");
  assert.equal(typeof body.starterPrompts[0]?.description, "string");
  assert.equal(typeof body.starterPrompts[0]?.prompt, "string");
});
