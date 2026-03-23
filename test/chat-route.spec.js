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
