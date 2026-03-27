import test from "node:test";
import assert from "node:assert/strict";
import * as app from "../public/app.js";
import {
  formatAssistantTurnLabel,
  getControlState,
  getSessionStatus,
} from "../public/lib/ui-state.js";

test("formatModelLabel adds clear speed and cost hints", () => {
  assert.equal(
    app.formatModelLabel({
      label: "GLM-4.7-Flash",
      speedTag: "Fast",
      costTag: "Balanced",
    }),
    "GLM-4.7-Flash · Fast · Balanced",
  );
});

test("getSessionSidebarToggleLabel switches copy for desktop collapse and mobile drawer states", () => {
  assert.equal(typeof app.getSessionSidebarToggleLabel, "function");

  assert.equal(
    app.getSessionSidebarToggleLabel({
      isMobileViewport: false,
      isSidebarCollapsed: false,
      isSidebarOpen: false,
    }),
    "隐藏对话栏",
  );

  assert.equal(
    app.getSessionSidebarToggleLabel({
      isMobileViewport: false,
      isSidebarCollapsed: true,
      isSidebarOpen: false,
    }),
    "显示对话栏",
  );

  assert.equal(
    app.getSessionSidebarToggleLabel({
      isMobileViewport: true,
      isSidebarCollapsed: false,
      isSidebarOpen: false,
    }),
    "对话记录",
  );

  assert.equal(
    app.getSessionSidebarToggleLabel({
      isMobileViewport: true,
      isSidebarCollapsed: false,
      isSidebarOpen: true,
    }),
    "收起对话",
  );
});

test("shouldCloseSessionSidebar distinguishes desktop collapse state from mobile drawer state", () => {
  assert.equal(typeof app.shouldCloseSessionSidebar, "function");

  assert.equal(
    app.shouldCloseSessionSidebar({
      isMobileViewport: false,
      isSidebarOpen: false,
      isSidebarCollapsed: false,
    }),
    true,
  );

  assert.equal(
    app.shouldCloseSessionSidebar({
      isMobileViewport: false,
      isSidebarOpen: false,
      isSidebarCollapsed: true,
    }),
    false,
  );

  assert.equal(
    app.shouldCloseSessionSidebar({
      isMobileViewport: true,
      isSidebarOpen: true,
      isSidebarCollapsed: false,
    }),
    true,
  );

  assert.equal(
    app.shouldCloseSessionSidebar({
      isMobileViewport: true,
      isSidebarOpen: false,
      isSidebarCollapsed: false,
    }),
    false,
  );
});

test("getNextSessionActionMenuId toggles the same menu closed and switches cleanly between sessions", () => {
  assert.equal(typeof app.getNextSessionActionMenuId, "function");

  assert.equal(app.getNextSessionActionMenuId(null, "s1"), "s1");
  assert.equal(app.getNextSessionActionMenuId("s1", "s1"), null);
  assert.equal(app.getNextSessionActionMenuId("s1", "s2"), "s2");
  assert.equal(app.getNextSessionActionMenuId("s2", null), null);
});

test("groupSessionsByUpdatedAt organizes recent chats into recency buckets while preserving order", () => {
  assert.equal(typeof app.groupSessionsByUpdatedAt, "function");

  const now = new Date(2026, 2, 26, 15, 0).getTime();
  const groups = app.groupSessionsByUpdatedAt(
    [
      { id: "s1", updatedAt: new Date(2026, 2, 26, 14, 30).getTime() },
      { id: "s2", updatedAt: new Date(2026, 2, 25, 21, 8).getTime() },
      { id: "s3", updatedAt: new Date(2026, 2, 23, 9, 0).getTime() },
      { id: "s4", updatedAt: new Date(2026, 2, 12, 8, 0).getTime() },
      { id: "s5", updatedAt: new Date(2026, 0, 14, 18, 20).getTime() },
    ],
    now,
  );

  assert.deepEqual(
    groups.map((group) => ({
      label: group.label,
      ids: group.sessions.map((session) => session.id),
    })),
    [
      { label: "今天", ids: ["s1"] },
      { label: "昨天", ids: ["s2"] },
      { label: "7 天内", ids: ["s3"] },
      { label: "30 天内", ids: ["s4"] },
      { label: "更早", ids: ["s5"] },
    ],
  );
});



test("buildAssistantContentPayload keeps streaming replies in plain-text mode to reduce flicker", () => {
  assert.equal(typeof app.buildAssistantContentPayload, "function");

  assert.deepEqual(
    app.buildAssistantContentPayload({
      role: "assistant",
      content: "第一段\n第二段",
      streaming: true,
      failureNote: "",
    }),
    {
      mode: "text",
      text: "第一段\n第二段",
      html: "",
      noteHtml: "",
    },
  );
});

test("extractCodeLanguage reads fenced code language hints from marked output classes", () => {
  assert.equal(typeof app.extractCodeLanguage, "function");

  assert.equal(app.extractCodeLanguage("language-js"), "js");
  assert.equal(app.extractCodeLanguage("hljs language-typescript"), "typescript");
  assert.equal(app.extractCodeLanguage("lang-python"), "python");
  assert.equal(app.extractCodeLanguage(""), "");
});

test("enhanceRenderedCodeBlocks adds toolbar, line numbers and explicit-language highlighting", () => {
  assert.equal(typeof app.enhanceRenderedCodeBlocks, "function");

  const html = app.enhanceRenderedCodeBlocks(
    '<p>示例</p><pre><code class="language-js">const answer = 42;\nconsole.log(answer);</code></pre>',
    {
      getLanguage(language) {
        return language === "js" ? {} : null;
      },
      highlight(code, { language }) {
        return {
          language,
          value: `<span class="hljs-keyword">const</span> answer = 42;\nconsole.log(answer);`,
        };
      },
      highlightAuto(code) {
        return {
          language: "plaintext",
          value: code,
        };
      },
    },
  );

  assert.match(html, /code-block-toolbar/);
  assert.match(html, /code-copy-button/);
  assert.match(html, /code-line-numbers/);
  assert.match(html, /JavaScript|JS/);
  assert.match(html, /hljs-keyword/);
  assert.match(html, />1</);
  assert.match(html, />2</);
});

test("enhanceRenderedCodeBlocks falls back to auto-detect when fenced code omits language", () => {
  assert.equal(typeof app.enhanceRenderedCodeBlocks, "function");

  const html = app.enhanceRenderedCodeBlocks("<pre><code>print(&quot;hi&quot;)\nprint(&quot;bye&quot;)</code></pre>", {
    getLanguage() {
      return null;
    },
    highlight(code, { language }) {
      return {
        language,
        value: code,
      };
    },
    highlightAuto() {
      return {
        language: "python",
        value: '<span class="hljs-built_in">print</span>("hi")\n<span class="hljs-built_in">print</span>("bye")',
      };
    },
  });

  assert.match(html, /Python/);
  assert.match(html, /hljs-built_in/);
});

test("enhanceRenderedCodeBlocks marks long fenced code blocks as collapsible with a friendly label", () => {
  const lines = Array.from({ length: 14 }, (_, index) => `const row${index + 1} = ${index + 1};`).join("\n");
  const html = app.enhanceRenderedCodeBlocks(
    `<pre><code class="language-tsx">${lines}</code></pre>`,
    {
      getLanguage(language) {
        return language === "tsx" ? {} : null;
      },
      highlight(code, { language }) {
        return {
          language,
          value: code,
        };
      },
      highlightAuto(code) {
        return {
          language: "plaintext",
          value: code,
        };
      },
    },
  );

  assert.match(html, /data-collapsible="true"/);
  assert.match(html, /data-expanded="false"/);
  assert.match(html, /code-toggle-button/);
  assert.match(html, /展开/);
  assert.match(html, /TSX \/ React/);
});

test("enhanceRenderedCodeBlocks keeps short fenced code blocks uncluttered", () => {
  const html = app.enhanceRenderedCodeBlocks(
    '<pre><code class="language-bash">echo "hello"\npwd</code></pre>',
    {
      getLanguage(language) {
        return language === "bash" ? {} : null;
      },
      highlight(code, { language }) {
        return {
          language,
          value: code,
        };
      },
      highlightAuto(code) {
        return {
          language: "plaintext",
          value: code,
        };
      },
    },
  );

  assert.match(html, /data-collapsible="false"/);
  assert.doesNotMatch(html, /code-toggle-button/);
  assert.match(html, /Bash/);
});

test("buildAssistantContentPayload keeps persisted code-block expansion state for completed replies", () => {
  const previousMarked = globalThis.marked;
  const previousPurify = globalThis.DOMPurify;
  const previousHljs = globalThis.hljs;

  globalThis.marked = {
    parse() {
      return `<pre><code class="language-tsx">const row1 = 1;
const row2 = 2;
const row3 = 3;
const row4 = 4;
const row5 = 5;
const row6 = 6;
const row7 = 7;
const row8 = 8;
const row9 = 9;
const row10 = 10;
const row11 = 11;
const row12 = 12;
const row13 = 13;</code></pre>`;
    },
  };
  globalThis.DOMPurify = {
    sanitize(html) {
      return html;
    },
  };
  globalThis.hljs = {
    getLanguage(language) {
      return language === "tsx" ? {} : null;
    },
    highlight(code, { language }) {
      return {
        language,
        value: code,
      };
    },
    highlightAuto(code) {
      return {
        language: "plaintext",
        value: code,
      };
    },
  };

  try {
    const payload = app.buildAssistantContentPayload(
      {
        role: "assistant",
        content: "```tsx\nconst row1 = 1;\nconst row2 = 2;\nconst row3 = 3;\nconst row4 = 4;\nconst row5 = 5;\nconst row6 = 6;\nconst row7 = 7;\nconst row8 = 8;\nconst row9 = 9;\nconst row10 = 10;\nconst row11 = 11;\nconst row12 = 12;\nconst row13 = 13;\n```",
        streaming: false,
        failureNote: "",
        createdAt: 1710000000000,
      },
      {
        expandedCodeBlocks: {
          "1710000000000:0": true,
        },
      },
    );

    assert.equal(payload.mode, "html");
    assert.match(payload.html, /data-code-block-key="1710000000000:0"/);
    assert.match(payload.html, /data-expanded="true"/);
    assert.match(payload.html, /aria-expanded="true"/);
    assert.match(payload.html, /收起/);
  } finally {
    globalThis.marked = previousMarked;
    globalThis.DOMPurify = previousPurify;
    globalThis.hljs = previousHljs;
  }
});

test("buildAssistantContentPayload enhances completed fenced code blocks without affecting streaming mode", () => {
  const previousMarked = globalThis.marked;
  const previousPurify = globalThis.DOMPurify;
  const previousHljs = globalThis.hljs;

  globalThis.marked = {
    parse() {
      return '<pre><code class="language-js">const value = 1;\nconsole.log(value);</code></pre>';
    },
  };
  globalThis.DOMPurify = {
    sanitize(html) {
      return html;
    },
  };
  globalThis.hljs = {
    getLanguage(language) {
      return language === "js" ? {} : null;
    },
    highlight(code, { language }) {
      return {
        language,
        value: `<span class="hljs-keyword">const</span> value = 1;\nconsole.log(value);`,
      };
    },
    highlightAuto(code) {
      return {
        language: "plaintext",
        value: code,
      };
    },
  };

  try {
    const payload = app.buildAssistantContentPayload({
      role: "assistant",
      content: "```js\nconst value = 1;\nconsole.log(value);\n```",
      streaming: false,
      failureNote: "",
    });

    assert.equal(payload.mode, "html");
    assert.match(payload.html, /code-block-toolbar/);
    assert.match(payload.html, /code-copy-button/);
    assert.match(payload.html, /code-line-numbers/);
  } finally {
    globalThis.marked = previousMarked;
    globalThis.DOMPurify = previousPurify;
    globalThis.hljs = previousHljs;
  }
});



test("getModelCatalogPreviewText exposes hidden-model count and names without clutter", () => {
  assert.equal(typeof app.getModelCatalogPreviewText, "function");

  const text = app.getModelCatalogPreviewText(
    [
      { label: "GLM-4.7-Flash", featured: true },
      { label: "Llama 4 Scout", featured: true },
      { label: "Mistral Small 3.1 24B", featured: false },
      { label: "DeepSeek R1 Distill Qwen 32B", featured: false },
      { label: "QwQ 32B", featured: false },
    ],
    [
      { label: "GLM-4.7-Flash", featured: true },
      { label: "Llama 4 Scout", featured: true },
    ],
  );

  assert.match(text, /还有 3 个模型/);
  assert.match(text, /Mistral Small 3.1 24B/);
  assert.match(text, /DeepSeek R1 Distill Qwen 32B/);
});

test("filterModelCatalog matches label, provider and model id fragments", () => {
  assert.equal(typeof app.filterModelCatalog, "function");

  const models = [
    {
      id: "@cf/zai-org/glm-4.7-flash",
      label: "GLM-4.7-Flash",
      provider: "Zhipu AI",
      family: "GLM",
      recommendedFor: "中文体验",
    },
    {
      id: "@cf/openai/gpt-oss-20b",
      label: "GPT-OSS 20B",
      provider: "OpenAI",
      family: "GPT-OSS",
      recommendedFor: "快速分析",
    },
  ];

  assert.deepEqual(app.filterModelCatalog(models, "openai").map((model) => model.id), [
    "@cf/openai/gpt-oss-20b",
  ]);
  assert.deepEqual(app.filterModelCatalog(models, "glm").map((model) => model.id), [
    "@cf/zai-org/glm-4.7-flash",
  ]);
  assert.equal(app.filterModelCatalog(models, "不存在").length, 0);
});

test("filterSessionList matches session title, history content and model metadata", () => {
  assert.equal(typeof app.filterSessionList, "function");

  const sessions = [
    {
      id: "s1",
      title: "Cloudflare Worker 重构",
      modelId: "@cf/zai-org/glm-4.7-flash",
      history: [
        { role: "user", content: "请帮我把侧边栏做成更顺手的历史面板" },
      ],
    },
    {
      id: "s2",
      title: "代码解释",
      modelId: "@cf/openai/gpt-oss-20b",
      history: [
        { role: "user", content: "解释一下为什么 streaming 会闪烁" },
      ],
    },
  ];
  const models = [
    {
      id: "@cf/zai-org/glm-4.7-flash",
      label: "GLM-4.7-Flash",
      shortLabel: "GLM",
      provider: "Zhipu AI",
      family: "GLM",
    },
    {
      id: "@cf/openai/gpt-oss-20b",
      label: "GPT-OSS 20B",
      shortLabel: "GPT-OSS",
      provider: "OpenAI",
      family: "GPT-OSS",
    },
  ];

  assert.deepEqual(app.filterSessionList(sessions, "worker", models).map((session) => session.id), [
    "s1",
  ]);
  assert.deepEqual(app.filterSessionList(sessions, "闪烁", models).map((session) => session.id), [
    "s2",
  ]);
  assert.deepEqual(app.filterSessionList(sessions, "openai", models).map((session) => session.id), [
    "s2",
  ]);
});

test("highlightSearchMatches safely wraps matched fragments for sidebar search results", () => {
  assert.equal(typeof app.highlightSearchMatches, "function");

  const html = app.highlightSearchMatches(
    'Cloudflare <Worker> 对话站点',
    "worker",
  );

  assert.match(html, /Cloudflare &lt;<mark class="match-highlight">Worker<\/mark>&gt; 对话站点/);
});

test("buildSessionSearchSummary keeps the sidebar search status compact", () => {
  assert.equal(typeof app.buildSessionSearchSummary, "function");

  assert.equal(
    app.buildSessionSearchSummary({ query: "", visibleCount: 12, totalCount: 12 }),
    "12 个对话",
  );
  assert.equal(
    app.buildSessionSearchSummary({ query: "worker", visibleCount: 3, totalCount: 12 }),
    "3 / 12 匹配",
  );
  assert.equal(
    app.buildSessionSearchSummary({ query: "worker", visibleCount: 0, totalCount: 12 }),
    "0 / 12 匹配",
  );
});

test("shouldSubmitFromKeyboardEvent avoids accidental send during IME composition", () => {
  assert.equal(typeof app.shouldSubmitFromKeyboardEvent, "function");

  assert.equal(
    app.shouldSubmitFromKeyboardEvent({ key: "Enter", shiftKey: false, isComposing: false }),
    true,
  );
  assert.equal(
    app.shouldSubmitFromKeyboardEvent({ key: "Enter", shiftKey: true, isComposing: false }),
    false,
  );
  assert.equal(
    app.shouldSubmitFromKeyboardEvent({ key: "Enter", shiftKey: false, isComposing: true }),
    false,
  );
});

test("normalizeStarterPrompt returns button-safe text for structured prompt cards", () => {
  assert.equal(typeof app.normalizeStarterPrompt, "function");

  const normalized = app.normalizeStarterPrompt(
    {
      title: "代码方案",
      description: "从需求出发拆分实现步骤、边界和风险。",
      prompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
    },
    0,
  );

  assert.deepEqual(normalized, {
    title: "代码方案",
    description: "从需求出发拆分实现步骤、边界和风险。",
    prompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
  });
});

test("normalizeStarterPrompt keeps legacy string prompts compatible", () => {
  assert.equal(typeof app.normalizeStarterPrompt, "function");

  const normalized = app.normalizeStarterPrompt(
    "请把这段内容总结成要点、结论和行动项。",
    1,
  );

  assert.deepEqual(normalized, {
    title: "示例 2",
    description: "请把这段内容总结成要点、结论和行动项。",
    prompt: "请把这段内容总结成要点、结论和行动项。",
  });
});

test("structured starter prompt cards keep plain prompt text through render and click helpers", () => {
  assert.equal(typeof app.buildStarterPromptButtonModel, "function");
  assert.equal(typeof app.readStarterPromptSelection, "function");

  const buttonModel = app.buildStarterPromptButtonModel(
    {
      title: "代码方案",
      description: "从需求出发拆分实现步骤、边界和风险。",
      prompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
    },
    0,
  );

  assert.deepEqual(buttonModel, {
    title: "代码方案",
    description: "从需求出发拆分实现步骤、边界和风险。",
    dataPrompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
  });
  assert.equal(
    app.readStarterPromptSelection({
      dataset: { prompt: buttonModel.dataPrompt },
    }),
    "请基于这个需求给出实现方案、边界条件和可能风险。",
  );
});

test("getControlState locks model and reset controls during generation", () => {
  assert.deepEqual(getControlState({ isSending: true, hasHistory: true }), {
    sendDisabled: true,
    inputDisabled: true,
    modelDisabled: true,
    resetDisabled: true,
  });
});

test("getSessionStatus labels interrupted partial generations as warnings", () => {
  assert.deepEqual(
    getSessionStatus({ phase: "interrupted", hasPartialContent: true }),
    { tone: "warning", message: "生成已中断，已保留部分内容。" },
  );
});

test("getSessionStatus reset copy matches the chat-site tone", () => {
  assert.deepEqual(getSessionStatus({ phase: "reset" }), {
    tone: "idle",
    message: "已清空当前会话，可以开始新的任务。",
  });
});

test("formatAssistantTurnLabel keeps request-start model visible for assistant turns", () => {
  assert.equal(
    formatAssistantTurnLabel({
      streaming: true,
      modelLabel: "GLM-4.7-Flash",
      fallbackLabel: "10:30",
    }),
    "GLM-4.7-Flash · 生成中",
  );
  assert.equal(
    formatAssistantTurnLabel({
      streaming: false,
      modelLabel: "GLM-4.7-Flash",
      fallbackLabel: "10:30",
    }),
    "GLM-4.7-Flash",
  );
  assert.equal(
    formatAssistantTurnLabel({
      streaming: false,
      modelLabel: "",
      fallbackLabel: "10:30",
    }),
    "10:30",
  );
});
