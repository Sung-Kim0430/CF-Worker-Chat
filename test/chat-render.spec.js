import test from "node:test";
import assert from "node:assert/strict";
import {
  getHistoryRenderMode,
  getMessagePatchMode,
  snapshotHistoryForRender,
} from "../public/lib/chat-render.js";

test("getHistoryRenderMode patches the last assistant message during streaming updates", () => {
  const previousHistory = snapshotHistoryForRender([
    {
      role: "user",
      content: "请帮我整理一下这段想法",
      createdAt: 1,
    },
    {
      role: "assistant",
      content: "当然，先从",
      modelId: "@cf/zai-org/glm-4.7-flash",
      modelLabel: "GLM-4.7-Flash",
      createdAt: 2,
      streaming: true,
      error: false,
    },
  ]);

  const nextHistory = snapshotHistoryForRender([
    {
      role: "user",
      content: "请帮我整理一下这段想法",
      createdAt: 1,
    },
    {
      role: "assistant",
      content: "当然，先从目标、约束和输出形式开始。",
      modelId: "@cf/zai-org/glm-4.7-flash",
      modelLabel: "GLM-4.7-Flash",
      createdAt: 2,
      streaming: true,
      error: false,
    },
  ]);

  assert.equal(getHistoryRenderMode(previousHistory, nextHistory), "patch-last-assistant");
});

test("getHistoryRenderMode rerenders when message count changes", () => {
  const previousHistory = snapshotHistoryForRender([
    {
      role: "user",
      content: "hello",
      createdAt: 1,
    },
  ]);
  const nextHistory = snapshotHistoryForRender([
    {
      role: "user",
      content: "hello",
      createdAt: 1,
    },
    {
      role: "assistant",
      content: "",
      createdAt: 2,
      streaming: true,
    },
  ]);

  assert.equal(getHistoryRenderMode(previousHistory, nextHistory), "rerender");
});

test("getHistoryRenderMode rerenders when an earlier message changes", () => {
  const previousHistory = snapshotHistoryForRender([
    {
      role: "user",
      content: "原始问题",
      createdAt: 1,
    },
    {
      role: "assistant",
      content: "第一版回答",
      modelId: "@cf/zai-org/glm-4.7-flash",
      modelLabel: "GLM-4.7-Flash",
      createdAt: 2,
      streaming: true,
    },
  ]);

  const nextHistory = snapshotHistoryForRender([
    {
      role: "user",
      content: "被修改的问题",
      createdAt: 1,
    },
    {
      role: "assistant",
      content: "第一版回答，后续继续",
      modelId: "@cf/zai-org/glm-4.7-flash",
      modelLabel: "GLM-4.7-Flash",
      createdAt: 2,
      streaming: true,
    },
  ]);

  assert.equal(getHistoryRenderMode(previousHistory, nextHistory), "rerender");
});


test("getMessagePatchMode limits active streaming updates to content-only patches", () => {
  const previousMessage = snapshotHistoryForRender([
    {
      role: "assistant",
      content: "第一段",
      modelId: "@cf/zai-org/glm-4.7-flash",
      modelLabel: "GLM-4.7-Flash",
      createdAt: 2,
      streaming: true,
      error: false,
    },
  ])[0];

  const nextMessage = {
    role: "assistant",
    content: `第一段
第二段`,
    modelId: "@cf/zai-org/glm-4.7-flash",
    modelLabel: "GLM-4.7-Flash",
    createdAt: 2,
    streaming: true,
    error: false,
  };

  assert.equal(getMessagePatchMode(previousMessage, nextMessage), "streaming-content-only");
});

test("getMessagePatchMode falls back to full-card patch when stream state changes", () => {
  const previousMessage = snapshotHistoryForRender([
    {
      role: "assistant",
      content: "第一段",
      modelId: "@cf/zai-org/glm-4.7-flash",
      modelLabel: "GLM-4.7-Flash",
      createdAt: 2,
      streaming: true,
      error: false,
    },
  ])[0];

  const nextMessage = {
    role: "assistant",
    content: `第一段
第二段`,
    modelId: "@cf/zai-org/glm-4.7-flash",
    modelLabel: "GLM-4.7-Flash",
    createdAt: 2,
    streaming: false,
    error: false,
  };

  assert.equal(getMessagePatchMode(previousMessage, nextMessage), "replace-card");
});
