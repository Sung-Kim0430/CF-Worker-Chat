import test from "node:test";
import assert from "node:assert/strict";
import {
  consumeCompleteSseBlocks,
  consumeFinalSseBlock,
  buildRequestHistory,
  applyAssistantFailure,
  applyAssistantStop,
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

test("stopping a reply retains partial text and omits empty stop notices from context", () => {
  const partial = { role: "assistant", content: "partial" };
  applyAssistantStop(partial);
  assert.equal(partial.content, "partial");
  assert.equal(partial.stopped, true);
  assert.equal(partial.streaming, false);
  assert.equal(partial.includeInHistory, true);
  const empty = { role: "assistant", content: "" };
  applyAssistantStop(empty);
  assert.equal(empty.includeInHistory, false);
  assert.deepEqual(buildRequestHistory([partial, empty]), [{ role: "assistant", content: "partial" }]);
});

test("request history excludes empty pending replies restored after a page reload", () => {
  assert.deepEqual(buildRequestHistory([
    { role: "user", content: "hello" },
    { role: "assistant", content: "" },
    { role: "assistant", content: "  " },
  ]), [{ role: "user", content: "hello" }]);
});

test("SSE model errors propagate without entering the visible answer", () => {
  const events = [];
  assert.throws(() => consumeCompleteSseBlocks(
    'data: {"error":{"message":"quota exceeded"}}\n\n',
    (text) => events.push(text),
  ), /quota exceeded/);
  assert.deepEqual(events, []);
});

test("Responses API output deltas are accepted without exposing reasoning deltas", () => {
  const events = [];
  const result = consumeCompleteSseBlocks(
    'data: {"type":"response.reasoning_text.delta","delta":"private"}\n\n' +
    'data: {"type":"response.output_text.delta","delta":"answer"}\n\n' +
    'data: [DONE]\n\n', (text) => events.push(text),
  );
  assert.deepEqual(events, ["answer"]);
  assert.equal(result.done, true);
});

test("Responses API failure events propagate the error", () => {
  assert.throws(() => consumeFinalSseBlock(
    'data: {"type":"response.failed","response":{"error":{"message":"inference failed"}}}',
    () => {},
  ), /inference failed/);
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
