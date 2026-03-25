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

test("POST /api/chat falls back to a local mock stream when AI binding is unavailable on localhost", async () => {
  const response = await worker.fetch(
    new Request("http://127.0.0.1:8787/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "请帮我写一段售前演示文案",
        history: [],
        model: "@cf/zai-org/glm-4.7-flash",
      }),
    }),
    {
      ASSETS: {
        fetch: () => {
          throw new Error("not used");
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/event-stream/);

  const body = await response.text();
  const combinedResponse = body
    .split("\n")
    .filter((line) => line.startsWith("data: ") && !line.includes("[DONE]"))
    .map((line) => JSON.parse(line.slice(6)).response)
    .join("");

  assert.match(body, /data: /);
  assert.match(body, /\[DONE\]/);
  assert.match(combinedResponse, /GLM-4\.7-Flash/);
  assert.match(combinedResponse, /mock 响应/);
});

test("POST /api/chat falls back to a local mock stream when localhost AI binding only supports remote execution", async () => {
  const response = await worker.fetch(
    new Request("http://localhost:8787/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "请生成一段 onboarding 欢迎词",
        history: [],
        model: "@cf/zai-org/glm-4.7-flash",
      }),
    }),
    {
      AI: {
        run: async () => {
          throw new Error("Binding AI needs to be run remotely");
        },
      },
      ASSETS: {
        fetch: () => {
          throw new Error("not used");
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/event-stream/);

  const body = await response.text();
  const combinedResponse = body
    .split("\n")
    .filter((line) => line.startsWith("data: ") && !line.includes("[DONE]"))
    .map((line) => JSON.parse(line.slice(6)).response)
    .join("");

  assert.match(body, /\[DONE\]/);
  assert.match(combinedResponse, /mock 响应/);
  assert.match(combinedResponse, /onboarding 欢迎词/);
});
