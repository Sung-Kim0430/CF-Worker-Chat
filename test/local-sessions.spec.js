import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInitialSessionStore,
  clearAllSessions,
  createEmptySession,
} from "../public/lib/local-sessions.js";

test("buildInitialSessionStore restores multiple local sessions and the active session id", () => {
  const store = buildInitialSessionStore({
    defaultModelId: "@cf/zai-org/glm-4.7-flash",
    availableModelIds: [
      "@cf/zai-org/glm-4.7-flash",
      "@cf/openai/gpt-oss-20b",
    ],
    storageValue: JSON.stringify({
      activeSessionId: "s2",
      sessions: [
        {
          id: "s1",
          title: "旧会话",
          createdAt: 1710000000000,
          updatedAt: 1710000001000,
          modelId: "@cf/zai-org/glm-4.7-flash",
          history: [],
          expandedCodeBlocks: {},
        },
        {
          id: "s2",
          title: "当前会话",
          createdAt: 1710000002000,
          updatedAt: 1710000003000,
          modelId: "@cf/openai/gpt-oss-20b",
          history: [{ role: "user", content: "hi", createdAt: 1710000003000 }],
          expandedCodeBlocks: { "1710000003000:0": true },
        },
      ],
    }),
  });

  assert.equal(store.activeSessionId, "s2");
  assert.equal(store.sessions.length, 2);
  assert.equal(store.sessions[0].id, "s2");
  assert.equal(store.sessions[0].modelId, "@cf/openai/gpt-oss-20b");
  assert.deepEqual(store.sessions[0].expandedCodeBlocks, {
    "1710000003000:0": true,
  });
});

test("buildInitialSessionStore falls back to the default model when a saved model is unavailable", () => {
  const store = buildInitialSessionStore({
    defaultModelId: "@cf/zai-org/glm-4.7-flash",
    availableModelIds: ["@cf/zai-org/glm-4.7-flash"],
    storageValue: JSON.stringify({
      activeSessionId: "s1",
      sessions: [
        {
          id: "s1",
          title: "需要回退",
          createdAt: 1710000000000,
          updatedAt: 1710000001000,
          modelId: "@cf/openai/gpt-oss-20b",
          history: [],
        },
      ],
    }),
  });

  assert.equal(store.sessions[0].modelId, "@cf/zai-org/glm-4.7-flash");
});

test("clearAllSessions returns one fresh empty session for a clean restart", () => {
  const store = clearAllSessions({
    defaultModelId: "@cf/zai-org/glm-4.7-flash",
    now: () => 1710000000000,
  });

  assert.equal(store.activeSessionId, "session-1710000000000");
  assert.equal(store.sessions.length, 1);
  assert.equal(store.sessions[0].history.length, 0);
  assert.equal(store.sessions[0].modelId, "@cf/zai-org/glm-4.7-flash");
  assert.deepEqual(store.sessions[0].expandedCodeBlocks, {});
});

test("createEmptySession derives a lightweight default shape for new chats", () => {
  const session = createEmptySession("@cf/zai-org/glm-4.7-flash", () => 1710000000000);

  assert.deepEqual(session, {
    id: "session-1710000000000",
    title: "新对话",
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    history: [],
    modelId: "@cf/zai-org/glm-4.7-flash",
    expandedCodeBlocks: {},
  });
});
