import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChatRequest } from "../src/lib/chat.js";

test("normalizeChatRequest rejects unsupported models", () => {
  assert.throws(
    () =>
      normalizeChatRequest({
        message: "hello",
        history: [],
        model: "@cf/not-real/model",
      }),
    /unsupported model/i,
  );
});
