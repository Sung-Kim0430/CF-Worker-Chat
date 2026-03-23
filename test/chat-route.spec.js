import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

test("POST /api/chat rejects invalid payloads", async () => {
  const response = await worker.fetch(
    new Request("https://app.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "",
        history: [],
      }),
    }),
    {
      AI: {
        run: async () => {
          throw new Error("should not run");
        },
      },
      ASSETS: {
        fetch: () => {
          throw new Error("not used");
        },
      },
    },
  );

  assert.equal(response.status, 400);
});

test("POST /api/chat surfaces model runtime failures as server errors", async () => {
  const response = await worker.fetch(
    new Request("https://app.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "hello",
        history: [],
        model: "@cf/zai-org/glm-4.7-flash",
      }),
    }),
    {
      AI: {
        run: async () => {
          throw new Error("upstream failure");
        },
      },
      ASSETS: {
        fetch: () => {
          throw new Error("not used");
        },
      },
    },
  );

  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, "model_inference_failed");
});
