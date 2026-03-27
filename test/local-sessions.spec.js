import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSessionTitle,
  buildInitialSessionStore,
  clearAllSessions,
  createEmptySession,
  formatSessionSidebarTimeLabel,
  formatSessionUpdatedLabel,
  getSessionUpdatedGroupLabel,
  getSessionPreviewText,
  renameSession,
  restoreAutoSessionTitle,
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
    titleManuallyEdited: false,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    history: [],
    modelId: "@cf/zai-org/glm-4.7-flash",
    expandedCodeBlocks: {},
  });
});

test("buildSessionTitle uses the first user message and strips markdown-like noise", () => {
  const title = buildSessionTitle([
    {
      role: "user",
      content: '##  "请帮我把这个 Cloudflare Worker 聊天站点重构一下，并清理 UI 文案"  ',
    },
    {
      role: "user",
      content: "后续追问不应该改变标题",
    },
  ]);

  assert.equal(title, "请帮我把这个 Cloudflare Wor…");
});

test("formatSessionUpdatedLabel prefers relative labels for recent sessions", () => {
  const now = new Date(2026, 2, 26, 15, 0).getTime();

  assert.equal(formatSessionUpdatedLabel(now - 30_000, now), "刚刚");
  assert.equal(formatSessionUpdatedLabel(now - 10 * 60_000, now), "10 分钟前");
});

test("formatSessionUpdatedLabel uses calendar-aware labels for older sessions", () => {
  const now = new Date(2026, 2, 26, 15, 0).getTime();

  assert.equal(
    formatSessionUpdatedLabel(new Date(2026, 2, 26, 9, 5).getTime(), now),
    "今天 09:05",
  );
  assert.equal(
    formatSessionUpdatedLabel(new Date(2026, 2, 25, 21, 8).getTime(), now),
    "昨天 21:08",
  );
  assert.equal(
    formatSessionUpdatedLabel(new Date(2026, 1, 14, 18, 20).getTime(), now),
    "02-14 18:20",
  );
});

test("formatSessionSidebarTimeLabel keeps sidebar timestamps compact across recency ranges", () => {
  const now = new Date(2026, 2, 26, 15, 0).getTime();

  assert.equal(formatSessionSidebarTimeLabel(now - 30_000, now), "刚刚");
  assert.equal(formatSessionSidebarTimeLabel(now - 10 * 60_000, now), "10分钟前");
  assert.equal(
    formatSessionSidebarTimeLabel(new Date(2026, 2, 26, 9, 5).getTime(), now),
    "09:05",
  );
  assert.equal(
    formatSessionSidebarTimeLabel(new Date(2026, 2, 25, 21, 8).getTime(), now),
    "昨天",
  );
  assert.equal(
    formatSessionSidebarTimeLabel(new Date(2026, 2, 23, 18, 20).getTime(), now),
    "周一",
  );
  assert.equal(
    formatSessionSidebarTimeLabel(new Date(2026, 1, 14, 18, 20).getTime(), now),
    "02-14",
  );
  assert.equal(
    formatSessionSidebarTimeLabel(new Date(2025, 1, 14, 18, 20).getTime(), now),
    "2025-02-14",
  );
});

test("getSessionUpdatedGroupLabel follows chat-style recency sections", () => {
  const now = new Date(2026, 2, 26, 15, 0).getTime();

  assert.equal(
    getSessionUpdatedGroupLabel(new Date(2026, 2, 26, 9, 5).getTime(), now),
    "今天",
  );
  assert.equal(
    getSessionUpdatedGroupLabel(new Date(2026, 2, 25, 21, 8).getTime(), now),
    "昨天",
  );
  assert.equal(
    getSessionUpdatedGroupLabel(new Date(2026, 2, 22, 18, 20).getTime(), now),
    "7 天内",
  );
  assert.equal(
    getSessionUpdatedGroupLabel(new Date(2026, 2, 4, 18, 20).getTime(), now),
    "30 天内",
  );
  assert.equal(
    getSessionUpdatedGroupLabel(new Date(2026, 0, 14, 18, 20).getTime(), now),
    "更早",
  );
});

test("renameSession keeps ordering timestamps stable while persisting a manual title", () => {
  const store = {
    activeSessionId: "s2",
    sessions: [
      {
        id: "s2",
        title: "原始标题",
        titleManuallyEdited: false,
        createdAt: 1710000002000,
        updatedAt: 1710000003000,
        modelId: "@cf/zai-org/glm-4.7-flash",
        history: [{ role: "user", content: "帮我整理 Cloudflare Worker 聊天站点", createdAt: 1710000003000 }],
        expandedCodeBlocks: {},
      },
      {
        id: "s1",
        title: "更早的会话",
        titleManuallyEdited: false,
        createdAt: 1710000000000,
        updatedAt: 1710000001000,
        modelId: "@cf/zai-org/glm-4.7-flash",
        history: [],
        expandedCodeBlocks: {},
      },
    ],
  };

  const renamed = renameSession(store, "s2", "  我的固定标题  ");

  assert.equal(renamed.activeSessionId, "s2");
  assert.equal(renamed.sessions[0].id, "s2");
  assert.equal(renamed.sessions[0].title, "我的固定标题");
  assert.equal(renamed.sessions[0].titleManuallyEdited, true);
  assert.equal(renamed.sessions[0].updatedAt, 1710000003000);
});

test("getSessionPreviewText prefers the latest meaningful message and strips markdown noise", () => {
  const preview = getSessionPreviewText({
    history: [
      { role: "user", content: "第一条消息" },
      { role: "assistant", content: "```js\nconst answer = 42;\n```" },
      { role: "assistant", content: '> **结果**：已经帮你整理完成，并保留了主要步骤。' },
    ],
  });

  assert.equal(preview, "结果：已经帮你整理完成，并保留了主要步骤。");
});

test("restoreAutoSessionTitle recalculates the title from history and clears the manual flag", () => {
  const store = {
    activeSessionId: "s1",
    sessions: [
      {
        id: "s1",
        title: "我的固定标题",
        titleManuallyEdited: true,
        createdAt: 1710000000000,
        updatedAt: 1710000003000,
        modelId: "@cf/zai-org/glm-4.7-flash",
        history: [
          {
            role: "user",
            content: "请把这个 Cloudflare Worker 对话站点继续做得更简洁一些",
            createdAt: 1710000001000,
          },
        ],
        expandedCodeBlocks: {},
      },
    ],
  };

  const restored = restoreAutoSessionTitle(store, "s1");

  assert.equal(restored.sessions[0].title, "请把这个 Cloudflare Worker…");
  assert.equal(restored.sessions[0].titleManuallyEdited, false);
  assert.equal(restored.sessions[0].updatedAt, 1710000003000);
});
