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
