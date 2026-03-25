import test from "node:test";
import assert from "node:assert/strict";
import {
  consumeCompleteSseBlocks,
  consumeFinalSseBlock,
  buildRequestHistory,
  applyAssistantFailure,
} from "../public/lib/chat-flow.js";

test("consumeCompleteSseBlocks emits complete SSE payloads and preserves trailing buffer", () => {
  const events = [];
  const result = consumeCompleteSseBlocks(
    'data: {"response":"hello"}\n\ndata: {"response":" world"}\n\ndata: {"response":"tail"}',
    (value) => {
      events.push(value);
    },
  );

  assert.equal(result.done, false);
  assert.equal(result.buffer, 'data: {"response":"tail"}');
  assert.deepEqual(events, ["hello", " world"]);
});

test("consumeFinalSseBlock preserves trailing SSE data without a blank terminator", () => {
  const events = [];
  const done = consumeFinalSseBlock('data: {"response":"tail"}', (value) => {
    events.push(value);
  });

  assert.equal(done, false);
  assert.deepEqual(events, ["tail"]);
});

test("buildRequestHistory excludes transient assistant failures", () => {
  const history = buildRequestHistory([
    { role: "user", content: "hello" },
    { role: "assistant", content: "partial", includeInHistory: true },
    { role: "assistant", content: "请求失败", includeInHistory: false },
  ]);

  assert.deepEqual(history, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "partial" },
  ]);
});

test("applyAssistantFailure preserves partial assistant output for history", () => {
  const message = {
    role: "assistant",
    content: "partial",
    includeInHistory: true,
  };
  const result = applyAssistantFailure(message, "网络错误");

  assert.equal(result, message);
  assert.equal(message.content, "partial");
  assert.equal(message.failureNote, "网络错误");
  assert.equal(message.error, true);
  assert.equal(message.includeInHistory, true);
});

test("applyAssistantFailure marks empty assistant failures as transient", () => {
  const message = {
    role: "assistant",
    content: "   ",
  };
  const result = applyAssistantFailure(message, "网络错误");

  assert.equal(result, message);
  assert.equal(message.content, "请求未完成：网络错误");
  assert.equal(message.error, true);
  assert.equal(message.includeInHistory, false);
});
