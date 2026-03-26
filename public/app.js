import {
  applyAssistantFailure,
  buildRequestHistory,
  consumeCompleteSseBlocks,
  consumeFinalSseBlock,
} from "./lib/chat-flow.js";
import {
  getHistoryRenderMode,
  getMessagePatchMode,
  snapshotHistoryForRender,
} from "./lib/chat-render.js";
import {
  formatAssistantTurnLabel,
  getControlState,
  getSessionStatus,
} from "./lib/ui-state.js";
import {
  buildSessionTitle,
  clearAllSessions,
  createNextSessionStore,
  persistSessionStore,
  replaceSession,
  restoreSessionStore,
  setActiveSessionId,
} from "./lib/local-sessions.js";

const state = {
  config: null,
  history: [],
  expandedCodeBlocks: {},
  sessionStore: {
    activeSessionId: null,
    sessions: [],
  },
  selectedModel: null,
  isSending: false,
  modelCatalogQuery: "",
  isCatalogOpen: false,
  isSessionMenuOpen: false,
  session: {
    phase: "booting",
  },
};

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
});
const sessionTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

let elements = null;
let messageRenderQueued = false;
let lastRenderedHistorySnapshot = [];

export function formatModelLabel(model) {
  return `${model.label} · ${model.speedTag} · ${model.costTag}`;
}

export function normalizeStarterPrompt(prompt, index = 0) {
  if (typeof prompt === "string") {
    return {
      title: `示例 ${index + 1}`,
      description: prompt,
      prompt,
    };
  }

  if (prompt && typeof prompt === "object") {
    const promptText = typeof prompt.prompt === "string" ? prompt.prompt : "";

    return {
      title:
        typeof prompt.title === "string" && prompt.title.trim()
          ? prompt.title
          : `示例 ${index + 1}`,
      description:
        typeof prompt.description === "string" ? prompt.description : promptText,
      prompt: promptText,
    };
  }

  return {
    title: `示例 ${index + 1}`,
    description: "",
    prompt: "",
  };
}

export function buildStarterPromptButtonModel(prompt, index = 0) {
  const promptCard = normalizeStarterPrompt(prompt, index);

  return {
    title: promptCard.title,
    description: promptCard.description,
    dataPrompt: promptCard.prompt,
  };
}

export function readStarterPromptSelection(button) {
  return button?.dataset?.prompt || "";
}

export function filterModelCatalog(models = [], query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return [...models];
  }

  return models.filter((model) => {
    const haystack = [
      model.id,
      model.label,
      model.shortLabel,
      model.provider,
      model.family,
      model.description,
      model.recommendedFor,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function getModelCatalogPreviewText(
  catalog = [],
  featuredModels = [],
  maxNames = 3,
) {
  const featuredIds = new Set(featuredModels.map((model) => model.id || model.label));
  const hiddenModels = catalog.filter(
    (model) => !featuredIds.has(model.id || model.label),
  );

  if (hiddenModels.length === 0) {
    return "当前显示的已经是全部模型。";
  }

  const previewNames = hiddenModels
    .slice(0, maxNames)
    .map((model) => model.label)
    .filter(Boolean);

  return `还有 ${hiddenModels.length} 个模型：${previewNames.join("、")}`;
}

export function shouldSubmitFromKeyboardEvent({
  key = "",
  shiftKey = false,
  isComposing = false,
} = {}) {
  return key === "Enter" && !shiftKey && !isComposing;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

export function extractCodeLanguage(classNames = "") {
  const match = String(classNames || "").match(/\b(?:language|lang)-([a-z0-9_+-]+)/i);
  return match ? match[1].toLowerCase() : "";
}

const CODE_BLOCK_COLLAPSE_LINE_THRESHOLD = 12;
const CODE_BLOCK_PREVIEW_LINES = 10;

function normalizeCodeLanguageLabel(language = "") {
  const normalized = String(language || "").toLowerCase();

  const labels = {
    bash: "Bash",
    csharp: "C#",
    cpp: "C++",
    cs: "C#",
    css: "CSS",
    go: "Go",
    graphql: "GraphQL",
    html: "HTML",
    http: "HTTP",
    ini: "INI",
    java: "Java",
    javascript: "JavaScript",
    js: "JavaScript",
    json: "JSON",
    jsx: "JSX / React",
    markdown: "Markdown",
    md: "Markdown",
    php: "PHP",
    plaintext: "Plain Text",
    powershell: "PowerShell",
    ps1: "PowerShell",
    py: "Python",
    python: "Python",
    rb: "Ruby",
    regex: "Regex",
    rs: "Rust",
    ruby: "Ruby",
    rust: "Rust",
    sh: "Shell",
    shell: "Shell",
    shellscript: "Shell",
    svelte: "Svelte",
    sql: "SQL",
    swift: "Swift",
    text: "Text",
    toml: "TOML",
    ts: "TypeScript",
    tsx: "TSX / React",
    typescript: "TypeScript",
    txt: "Text",
    vue: "Vue",
    xml: "XML",
    yaml: "YAML",
    yml: "YAML",
    zsh: "Shell",
    dockerfile: "Dockerfile",
    diff: "Diff",
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  if (!normalized) {
    return "代码";
  }

  return normalized.replace(/(^\w|[-+_]\w)/g, (token) =>
    token.replace(/[-+_]/g, "").toUpperCase(),
  );
}

function renderCodeLineNumbers(rawCode = "") {
  const lineCount = Math.max(rawCode.split("\n").length, 1);

  return Array.from({ length: lineCount }, (_, index) => `<span>${index + 1}</span>`).join("");
}

function getCodeBlockLineCount(rawCode = "") {
  return Math.max(String(rawCode || "").split("\n").length, 1);
}

function getCodeBlockKey(codeBlockKeyPrefix = "", blockIndex = 0) {
  const normalizedPrefix = String(codeBlockKeyPrefix || "").trim();

  if (!normalizedPrefix) {
    return "";
  }

  return `${normalizedPrefix}:${blockIndex}`;
}

function highlightCode(rawCode, explicitLanguage, highlighter = globalThis.hljs) {
  const safeFallback = {
    language: explicitLanguage || "",
    value: escapeHtml(rawCode),
  };

  if (!highlighter || typeof highlighter !== "object") {
    return safeFallback;
  }

  try {
    if (
      explicitLanguage &&
      typeof highlighter.getLanguage === "function" &&
      highlighter.getLanguage(explicitLanguage) &&
      typeof highlighter.highlight === "function"
    ) {
      return highlighter.highlight(rawCode, {
        language: explicitLanguage,
        ignoreIllegals: true,
      });
    }

    if (typeof highlighter.highlightAuto === "function") {
      return highlighter.highlightAuto(rawCode);
    }
  } catch {
    return safeFallback;
  }

  return safeFallback;
}

function buildCodeBlockHtml({
  rawCode = "",
  highlightedHtml = "",
  language = "",
  codeBlockKey = "",
  expanded = false,
} = {}) {
  const lineCount = getCodeBlockLineCount(rawCode);
  const isCollapsible = lineCount > CODE_BLOCK_COLLAPSE_LINE_THRESHOLD;
  const isExpanded = isCollapsible ? Boolean(expanded) : true;
  const normalizedLanguage = String(language || "").toLowerCase();
  const languageLabel = normalizeCodeLanguageLabel(normalizedLanguage);
  const languageClass = normalizedLanguage
    ? ` language-${escapeHtml(normalizedLanguage)}`
    : "";
  const toggleButton = isCollapsible
    ? `<button class="code-toggle-button" type="button" aria-expanded="${isExpanded}">${isExpanded ? "收起" : "展开"}</button>`
    : "";
  const codeBlockKeyAttribute = codeBlockKey
    ? ` data-code-block-key="${escapeHtml(codeBlockKey)}"`
    : "";

  return `
    <div
      class="code-block"
      data-language="${escapeHtml(normalizedLanguage || "plain")}"
      data-collapsible="${isCollapsible}"
      data-expanded="${isExpanded}"
      ${codeBlockKeyAttribute}
      style="--code-preview-lines: ${CODE_BLOCK_PREVIEW_LINES};"
    >
      <div class="code-block-toolbar">
        <span class="code-block-language">${escapeHtml(languageLabel)}</span>
        <div class="code-block-actions">
          ${toggleButton}
          <button class="code-copy-button" type="button">复制</button>
        </div>
      </div>
      <div class="code-block-body">
        <div class="code-line-numbers" aria-hidden="true">${renderCodeLineNumbers(rawCode)}</div>
        <pre><code class="hljs${languageClass}">${highlightedHtml}</code></pre>
      </div>
    </div>
  `;
}

export function enhanceRenderedCodeBlocks(html, highlighter = globalThis.hljs, options = {}) {
  let codeBlockIndex = 0;

  return String(html || "").replace(
    /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (_, attributeSource = "", encodedCode = "") => {
      const classMatch = attributeSource.match(/\bclass=(["'])(.*?)\1/i);
      const explicitLanguage = extractCodeLanguage(classMatch?.[2] || "");
      const rawCode = decodeHtmlEntities(encodedCode).replaceAll("\r\n", "\n");
      const highlighted = highlightCode(rawCode, explicitLanguage, highlighter);
      const codeBlockKey = getCodeBlockKey(
        options.codeBlockKeyPrefix,
        codeBlockIndex,
      );
      const expanded =
        codeBlockKey &&
        Boolean(options.expandedCodeBlocks?.[codeBlockKey]);

      codeBlockIndex += 1;

      return buildCodeBlockHtml({
        rawCode,
        highlightedHtml: highlighted?.value || escapeHtml(rawCode),
        language: highlighted?.language || explicitLanguage,
        codeBlockKey,
        expanded,
      });
    },
  );
}

function fallbackMarkdownToHtml(markdown) {
  const escaped = escapeHtml(markdown).trim();

  if (!escaped) {
    return "<p>模型未返回内容。</p>";
  }

  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function renderMarkdown(markdown, options = {}) {
  const parser = globalThis.marked;
  const purifier = globalThis.DOMPurify;

  try {
    const rawHtml = parser?.parse
      ? parser.parse(markdown, { gfm: true, breaks: true })
      : fallbackMarkdownToHtml(markdown);
    const safeHtml = purifier?.sanitize ? purifier.sanitize(rawHtml) : rawHtml;
    const enhancedHtml = enhanceRenderedCodeBlocks(safeHtml, globalThis.hljs, options);

    return purifier?.sanitize ? purifier.sanitize(enhancedHtml) : enhancedHtml;
  } catch {
    return fallbackMarkdownToHtml(markdown);
  }
}

function getAllModels() {
  if (!state.config) {
    return [];
  }

  return state.config.modelCatalog ?? state.config.models ?? [];
}

function getFeaturedModelsForView() {
  if (!state.config) {
    return [];
  }

  const featured = state.config.featuredModels ?? [];

  if (featured.length > 0) {
    return featured;
  }

  return getAllModels().slice(0, 4);
}

function getSelectedModelMeta() {
  return getAllModels().find((model) => model.id === state.selectedModel) ?? null;
}

function getDefaultModelId() {
  return (
    state.config?.defaultModel ||
    state.config?.featuredModels?.[0]?.id ||
    state.config?.modelCatalog?.[0]?.id ||
    state.config?.models?.[0]?.id ||
    null
  );
}

function getAvailableModelIds() {
  return getAllModels()
    .map((model) => model.id)
    .filter(Boolean);
}

function getSafeLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getActiveSession() {
  const sessions = state.sessionStore.sessions || [];

  return sessions.find((session) => session.id === state.sessionStore.activeSessionId)
    ?? sessions[0]
    ?? null;
}

function syncStateFromActiveSession({ resetRenderSnapshot = false } = {}) {
  const activeSession = getActiveSession();

  if (!activeSession) {
    state.history = [];
    state.expandedCodeBlocks = {};
    state.selectedModel = getDefaultModelId();

    if (resetRenderSnapshot) {
      lastRenderedHistorySnapshot = [];
    }

    return;
  }

  state.sessionStore.activeSessionId = activeSession.id;
  state.history = activeSession.history;
  state.expandedCodeBlocks = activeSession.expandedCodeBlocks;
  state.selectedModel = activeSession.modelId || getDefaultModelId();

  if (resetRenderSnapshot) {
    lastRenderedHistorySnapshot = [];
  }
}

function persistLocalSessionStore() {
  persistSessionStore(getSafeLocalStorage(), state.sessionStore);
}

function restoreLocalSessionStore() {
  state.sessionStore = restoreSessionStore(getSafeLocalStorage(), {
    defaultModelId: getDefaultModelId(),
    availableModelIds: getAvailableModelIds(),
    now: Date.now,
  });
  syncStateFromActiveSession({ resetRenderSnapshot: true });
}

function touchActiveSession({ preserveTitle = false } = {}) {
  const activeSession = getActiveSession();

  if (!activeSession) {
    return null;
  }

  const nextSession = {
    ...activeSession,
    history: [...activeSession.history],
    expandedCodeBlocks: { ...activeSession.expandedCodeBlocks },
    modelId: state.selectedModel || activeSession.modelId || getDefaultModelId(),
    updatedAt: Date.now(),
  };

  if (!preserveTitle) {
    nextSession.title = buildSessionTitle(nextSession.history);
  }

  state.sessionStore = {
    ...replaceSession(state.sessionStore, nextSession),
    activeSessionId: nextSession.id,
  };
  syncStateFromActiveSession();
  persistLocalSessionStore();

  return getActiveSession();
}

function createNewChatSession() {
  state.sessionStore = createNextSessionStore(state.sessionStore, {
    defaultModelId: state.selectedModel || getDefaultModelId(),
    now: Date.now,
  });
  state.isSessionMenuOpen = false;
  syncStateFromActiveSession({ resetRenderSnapshot: true });
  persistLocalSessionStore();
}

function switchToSession(sessionId) {
  state.sessionStore = setActiveSessionId(state.sessionStore, sessionId);
  state.isSessionMenuOpen = false;
  state.isCatalogOpen = false;
  syncStateFromActiveSession({ resetRenderSnapshot: true });
  persistLocalSessionStore();
}

function clearAllLocalSessions() {
  state.sessionStore = clearAllSessions({
    defaultModelId: getDefaultModelId(),
    now: Date.now,
  });
  state.isCatalogOpen = false;
  state.isSessionMenuOpen = false;
  syncStateFromActiveSession({ resetRenderSnapshot: true });
  persistLocalSessionStore();
}

function isNearBottom(container) {
  const threshold = 140;
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <=
    threshold
  );
}

function buildMessageCodeBlockRenderOptions(message, options = {}) {
  return {
    codeBlockKeyPrefix:
      message?.createdAt != null ? String(message.createdAt) : "",
    expandedCodeBlocks: options.expandedCodeBlocks ?? {},
  };
}

function updateCodeToggleButtonState(button, expanded) {
  if (!button) {
    return;
  }

  button.textContent = expanded ? "收起" : "展开";
  button.setAttribute("aria-expanded", String(expanded));
}

function setExpandedCodeBlockState(codeBlockKey, expanded) {
  if (!codeBlockKey) {
    return;
  }

  if (expanded) {
    state.expandedCodeBlocks[codeBlockKey] = true;
    touchActiveSession({ preserveTitle: true });
    return;
  }

  delete state.expandedCodeBlocks[codeBlockKey];

  touchActiveSession({ preserveTitle: true });
}

function toggleCodeBlockExpansion(button) {
  const codeBlock = button?.closest(".code-block");

  if (!codeBlock || codeBlock.dataset.collapsible !== "true") {
    return;
  }

  const nextExpanded = codeBlock.dataset.expanded !== "true";
  codeBlock.dataset.expanded = String(nextExpanded);
  updateCodeToggleButtonState(button, nextExpanded);
  setExpandedCodeBlockState(codeBlock.dataset.codeBlockKey, nextExpanded);
}

function scheduleMessageRender() {
  if (messageRenderQueued || !elements) {
    return;
  }

  messageRenderQueued = true;
  requestAnimationFrame(() => {
    messageRenderQueued = false;
    renderMessages();
  });
}

function autoResizeTextarea() {
  if (!elements) {
    return;
  }

  elements.userInput.style.height = "auto";
  elements.userInput.style.height = `${Math.min(
    elements.userInput.scrollHeight,
    220,
  )}px`;
}

function getCurrentControlState() {
  return getControlState({
    isSending: state.isSending,
    hasHistory: state.history.length > 0,
    hasInput: Boolean(elements?.userInput?.value.trim()),
  });
}

function getSessionPhaseLabel() {
  if (state.session.phase === "sending") {
    return "生成中";
  }

  if (state.session.phase === "interrupted") {
    return state.session.hasPartialContent ? "部分保留" : "请求失败";
  }

  if (state.session.phase === "complete") {
    return "已完成";
  }

  if (state.session.phase === "model-selected") {
    return "已切换";
  }

  if (state.session.phase === "reset") {
    return "已重置";
  }

  if (state.session.phase === "config-error") {
    return "配置异常";
  }

  if (state.session.phase === "booting") {
    return "加载中";
  }

  return "待提问";
}

function getSessionHeadline(modelLabel) {
  if (state.session.phase === "sending") {
    return `${modelLabel} 生成中，本轮已锁定模型。`;
  }

  if (state.session.phase === "interrupted" && state.session.hasPartialContent) {
    return "生成中断，已保留部分内容。";
  }

  if (state.session.phase === "interrupted") {
    return "请求未成功返回内容。";
  }

  if (state.session.phase === "complete") {
    return "回答已完成，可以继续追问。";
  }

  if (state.session.phase === "model-selected") {
    return `${modelLabel} 已就绪。`;
  }

  if (state.session.phase === "reset") {
    return "会话已清空。";
  }

  if (state.history.length === 0) {
    return "从一个明确问题开始。";
  }

  return `当前会话已记录 ${state.history.length} 条消息。`;
}

function renderSessionSummary() {
  if (!elements || !state.config) {
    return;
  }

  const { tone } = getSessionStatus(state.session);
  const selectedModel = getSelectedModelMeta();
  const modelLabel =
    state.session.modelLabel ||
    selectedModel?.label ||
    state.config.defaultModel ||
    "当前模型";
  const metaCards = [
    {
      label: "当前模型",
      value: modelLabel,
      detail: selectedModel?.recommendedFor || "用于当前会话的模型标识",
      tone: "info",
    },
    {
      label: "会话阶段",
      value: getSessionPhaseLabel(),
      detail: state.isSending
        ? "发送期间自动锁定模型和重置操作"
        : "当前可以继续提问、切换模型或重置会话",
      tone,
    },
    {
      label: "上下文条目",
      value: `${state.history.length} 条消息`,
      detail:
        state.history.length > 0
          ? "后续对话只会回传持久化内容，不会混入瞬时失败"
          : "首轮提问会从空上下文开始",
      tone: "neutral",
    },
    {
      label: "目录策略",
      value: `${getFeaturedModelsForView().length} 个常用模型`,
      detail: state.isCatalogOpen
        ? `${filterModelCatalog(getAllModels(), state.modelCatalogQuery).length} 个结果可选`
        : `${getAllModels().length} 个模型已收纳进目录面板`,
      tone: state.isCatalogOpen ? "info" : "neutral",
    },
  ];

  elements.sessionSummary.dataset.state = tone;
  elements.sessionHeadline.textContent = getSessionHeadline(modelLabel);
  elements.sessionMeta.innerHTML = metaCards
    .map(
      (item) => `
        <article class="meta-card" data-tone="${escapeHtml(item.tone)}">
          <p class="meta-kicker">${escapeHtml(item.label)}</p>
          <strong class="meta-value">${escapeHtml(item.value)}</strong>
          <span class="meta-detail">${escapeHtml(item.detail)}</span>
        </article>
      `,
    )
    .join("");
}

export function buildAssistantContentPayload(message, options = {}) {
  const noteHtml = message.failureNote
    ? `<p class="message-note"><strong>系统提示：</strong>${escapeHtml(message.failureNote)}</p>`
    : "";

  if (message.streaming) {
    return {
      mode: "text",
      text: message.content || "",
      html: "",
      noteHtml,
    };
  }

  return {
    mode: "html",
    text: "",
    html: renderMarkdown(
      message.content,
      buildMessageCodeBlockRenderOptions(message, options),
    ),
    noteHtml,
  };
}

function renderAssistantContent(message) {
  const payload = buildAssistantContentPayload(message, {
    expandedCodeBlocks: state.expandedCodeBlocks,
  });

  if (payload.mode === "text") {
    return {
      mode: payload.mode,
      html: `
        <div class="message-stream-text">${escapeHtml(payload.text)}</div>
        ${payload.noteHtml}
      `,
    };
  }

  return {
    mode: payload.mode,
    html: `${payload.html}${payload.noteHtml}`,
  };
}

function getMessageModelLabel(message) {
  if (typeof message.modelLabel === "string" && message.modelLabel.trim()) {
    return message.modelLabel;
  }

  return getAllModels().find((item) => item.id === message.modelId)?.label ?? "AI 助手";
}

function getAssistantMessageStateLabel(message) {
  if (message.streaming) {
    return "生成中";
  }

  if (message.error && message.failureNote) {
    return "已中断";
  }

  if (message.error) {
    return "请求失败";
  }

  return "已完成";
}

function buildMessageCardViewModel(message) {
  const pillText =
    message.role === "assistant"
      ? formatAssistantTurnLabel({
          streaming: message.streaming,
          modelLabel: getMessageModelLabel(message),
          fallbackLabel: timeFormatter.format(message.createdAt),
          stateLabel: getAssistantMessageStateLabel(message),
        })
      : timeFormatter.format(message.createdAt);
  const pillClass =
    message.role === "assistant" && message.streaming
      ? "message-pill message-pill-live"
      : "message-pill";
  const assistantContent =
    message.role === "assistant" ? renderAssistantContent(message) : null;

  return {
    cardClass: `message-card ${message.role}${message.error ? " error" : ""}`,
    roleLabel: message.role === "assistant" ? "AI" : "你",
    pillClass,
    pillText,
    contentMode: assistantContent?.mode || "html",
    contentHtml:
      message.role === "assistant"
        ? assistantContent.html
        : `<p>${escapeHtml(message.content)}</p>`,
  };
}

function buildMessageCardHtml(message) {
  const viewModel = buildMessageCardViewModel(message);

  return `
    <article class="${viewModel.cardClass}" data-streaming="${message.streaming ? "true" : "false"}">
      <div class="message-meta">
        <span class="message-role">${viewModel.roleLabel}</span>
        <span class="${viewModel.pillClass}">${escapeHtml(viewModel.pillText)}</span>
      </div>
      <div class="message-content${viewModel.contentMode === "text" ? " message-content-streaming" : ""}" data-content-mode="${viewModel.contentMode}">${viewModel.contentHtml}</div>
    </article>
  `;
}

function patchMessageCard(cardElement, message, patchMode = "replace-card") {
  if (!cardElement) {
    return false;
  }

  const viewModel = buildMessageCardViewModel(message);
  const roleElement = cardElement.querySelector(".message-role");
  const pillElement = cardElement.querySelector(".message-pill");
  const contentElement = cardElement.querySelector(".message-content");

  if (!roleElement || !pillElement || !contentElement) {
    return false;
  }

  if (patchMode === "streaming-content-only") {
    const streamTextElement = contentElement.querySelector(".message-stream-text");

    if (!streamTextElement) {
      return false;
    }

    const payload = buildAssistantContentPayload(message);
    streamTextElement.textContent = payload.text;
    return true;
  }

  if (cardElement.className !== viewModel.cardClass) {
    cardElement.className = viewModel.cardClass;
  }

  const nextStreamingState = message.streaming ? "true" : "false";
  if (cardElement.dataset.streaming !== nextStreamingState) {
    cardElement.dataset.streaming = nextStreamingState;
  }

  if (roleElement.textContent !== viewModel.roleLabel) {
    roleElement.textContent = viewModel.roleLabel;
  }

  if (pillElement.className !== viewModel.pillClass) {
    pillElement.className = viewModel.pillClass;
  }

  if (pillElement.textContent !== viewModel.pillText) {
    pillElement.textContent = viewModel.pillText;
  }

  const nextContentClass = `message-content${viewModel.contentMode === "text" ? " message-content-streaming" : ""}`;
  if (contentElement.className !== nextContentClass) {
    contentElement.className = nextContentClass;
  }

  if (contentElement.dataset.contentMode !== viewModel.contentMode) {
    contentElement.dataset.contentMode = viewModel.contentMode;
  }

  if (contentElement.innerHTML !== viewModel.contentHtml) {
    contentElement.innerHTML = viewModel.contentHtml;
  }

  return true;
}

function patchLastAssistantMessage(previousMessageSnapshot, message) {
  if (!elements?.chatHistory || message?.role !== "assistant") {
    return false;
  }

  const patchMode = getMessagePatchMode(previousMessageSnapshot, message);

  if (patchMode === "noop") {
    return true;
  }

  return patchMessageCard(elements.chatHistory.lastElementChild, message, patchMode);
}

function updateSessionStatus() {
  if (!elements) {
    return;
  }

  const { tone, message } = getSessionStatus(state.session);
  elements.chatStatus.dataset.state = tone;
  elements.chatStatus.textContent = message;
}

function renderShell() {
  if (!elements || !state.config) {
    return;
  }

  document.title = state.config.title;
}

function renderModelMeta() {
  return null;
}

function renderFeaturedModels() {
  const featuredModels = getFeaturedModelsForView();
  const controlState = getCurrentControlState();

  elements.featuredModelList.innerHTML = featuredModels
    .map((model) => {
      const isActive = model.id === state.selectedModel;

      return `
        <button
          class="model-choice${isActive ? " active" : ""}"
          type="button"
          data-model-id="${escapeHtml(model.id)}"
          aria-pressed="${isActive ? "true" : "false"}"
          ${controlState.modelDisabled ? "disabled" : ""}
        >
          <strong>${escapeHtml(model.shortLabel || model.label)}</strong>
        </button>
      `;
    })
    .join("");
}

function renderModelCatalog() {
  const controlState = getCurrentControlState();
  const modelPickerCopy = state.config?.modelPicker ?? {};
  const allModels = getAllModels();
  const filteredModels = filterModelCatalog(allModels, state.modelCatalogQuery);

  elements.modelCatalogToggle.disabled = controlState.modelDisabled;
  elements.modelCatalogToggle.textContent = state.isCatalogOpen
    ? "收起模型"
    : "更多模型";
  elements.modelCatalogToggle.setAttribute(
    "aria-expanded",
    state.isCatalogOpen ? "true" : "false",
  );
  elements.modelCatalogPanel.hidden = !state.isCatalogOpen;
  elements.modelSearchInput.placeholder =
    modelPickerCopy.searchPlaceholder || "搜索模型或提供方";
  elements.modelSearchInput.value = state.modelCatalogQuery;
  elements.modelSearchInput.disabled = controlState.modelDisabled;

  elements.modelCatalogList.innerHTML = filteredModels.length
    ? filteredModels
        .map((model) => {
          const isActive = model.id === state.selectedModel;

          return `
            <button
              class="catalog-option${isActive ? " active" : ""}"
              type="button"
              data-model-id="${escapeHtml(model.id)}"
              ${controlState.modelDisabled ? "disabled" : ""}
            >
              <span class="catalog-option-title-row">
                <strong>${escapeHtml(model.label)}</strong>
                <small>${escapeHtml(model.provider || "Workers AI")}</small>
              </span>
              <span class="catalog-option-copy">${escapeHtml(model.description)}</span>
            </button>
          `;
        })
        .join("")
    : `<p class="catalog-empty">没有找到匹配的模型，请换个关键词试试。</p>`;
}

function renderSessionList() {
  const activeSessionId = state.sessionStore.activeSessionId;
  const sessions = state.sessionStore.sessions || [];
  const controlState = getCurrentControlState();

  elements.sessionMenuToggle.disabled = state.isSending;
  elements.sessionMenuToggle.setAttribute(
    "aria-expanded",
    state.isSessionMenuOpen ? "true" : "false",
  );
  elements.sessionMenuPanel.hidden = !state.isSessionMenuOpen;
  elements.clearAllSessionsButton.disabled =
    state.isSending || sessions.length === 0;

  elements.sessionList.innerHTML = sessions.length
    ? sessions
        .map((session) => {
          const isActive = session.id === activeSessionId;
          const messageCount = session.history.length;

          return `
            <button
              class="session-option${isActive ? " active" : ""}"
              type="button"
              data-session-id="${escapeHtml(session.id)}"
              ${controlState.modelDisabled ? "disabled" : ""}
            >
              <span class="session-option-title-row">
                <strong>${escapeHtml(session.title || "新对话")}</strong>
                <small>${escapeHtml(sessionTimeFormatter.format(session.updatedAt))}</small>
              </span>
              <span class="session-option-copy">${escapeHtml(
                messageCount > 0 ? `${messageCount} 条消息` : "空白对话",
              )}</span>
            </button>
          `;
        })
        .join("")
    : `<p class="catalog-empty">还没有本地对话。</p>`;
}

function renderMessages() {
  if (!elements) {
    return;
  }

  const shouldStick = isNearBottom(elements.chatHistory);
  const nextHistorySnapshot = snapshotHistoryForRender(state.history);
  const renderMode = getHistoryRenderMode(
    lastRenderedHistorySnapshot,
    nextHistorySnapshot,
  );

  if (state.history.length === 0) {
    elements.chatHistory.innerHTML = `
      <section class="empty-state">
        <p>开始新的对话。</p>
      </section>
    `;
    lastRenderedHistorySnapshot = nextHistorySnapshot;
    return;
  }

  if (
    renderMode === "patch-last-assistant" &&
    patchLastAssistantMessage(
      lastRenderedHistorySnapshot[lastRenderedHistorySnapshot.length - 1],
      state.history[state.history.length - 1],
    )
  ) {
    lastRenderedHistorySnapshot = nextHistorySnapshot;
    if (shouldStick) {
      elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
    }
    return;
  }

  if (renderMode === "noop") {
    return;
  }

  elements.chatHistory.innerHTML = state.history.map(buildMessageCardHtml).join("");
  lastRenderedHistorySnapshot = nextHistorySnapshot;

  if (shouldStick) {
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
  }
}

async function copyTextToClipboard(text) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("clipboard_unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function updateCopyButtonState(button, nextLabel) {
  if (!button) {
    return;
  }

  clearTimeout(button._copyResetTimer);
  const baseLabel = button.dataset.baseLabel || button.textContent || "复制";

  button.dataset.baseLabel = baseLabel;
  button.textContent = nextLabel;
  button.dataset.copyState = nextLabel;

  if (nextLabel !== baseLabel) {
    button._copyResetTimer = setTimeout(() => {
      button.textContent = baseLabel;
      button.dataset.copyState = "";
    }, 1800);
  }
}

function renderOperatorPanel() {
  if (!elements || !state.config) {
    return;
  }

  renderFeaturedModels();
  renderModelCatalog();
  renderSessionList();
}

function renderComposer() {
  if (!elements) {
    return;
  }

  const controlState = getCurrentControlState();

  elements.sendButton.disabled = controlState.sendDisabled;
  elements.userInput.disabled = controlState.inputDisabled;
  elements.newChatButton.disabled = state.isSending;
}

async function streamAssistantReply(response, assistantMessage) {
  if (!response.body) {
    throw new Error("响应体为空，无法读取模型输出。");
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/event-stream")) {
    const text = await response.text();
    assistantMessage.content = text;
    renderMessages();
    return;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let completed = false;

  while (!completed) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    const result = consumeCompleteSseBlocks(buffer + value, (text) => {
      assistantMessage.content += text;
      scheduleMessageRender();
    });
    buffer = result.buffer;
    completed = result.done;
  }

  if (!completed) {
    consumeFinalSseBlock(buffer, (text) => {
      assistantMessage.content += text;
      scheduleMessageRender();
    });
  }

  if (!assistantMessage.content.trim()) {
    assistantMessage.content = "模型未返回可显示内容，请尝试换个问题或切换模型。";
    renderMessages();
  }
}

async function readErrorMessage(response) {
  const fallback = `请求失败（${response.status}）`;
  const text = await response.text();

  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text);
    return payload.error?.message || text;
  } catch {
    return text;
  }
}

async function sendMessage(messageText) {
  if (!state.config || state.isSending) {
    return;
  }

  const trimmed = messageText.trim();

  if (!trimmed) {
    return;
  }

  const selectedModel = getSelectedModelMeta();
  const requestModelId = selectedModel?.id || state.selectedModel;
  const requestModelLabel = selectedModel?.label || "当前模型";
  const historyForRequest = buildRequestHistory(state.history);

  const userMessage = {
    role: "user",
    content: trimmed,
    createdAt: Date.now(),
  };
  const assistantMessage = {
    role: "assistant",
    content: "",
    modelId: requestModelId,
    modelLabel: requestModelLabel,
    createdAt: Date.now(),
    streaming: true,
    error: false,
  };

  state.history.push(userMessage, assistantMessage);
  touchActiveSession();
  state.isSending = true;
  state.session = {
    phase: "sending",
    modelLabel: requestModelLabel,
  };
  elements.userInput.value = "";
  autoResizeTextarea();
  renderMessages();
  renderComposer();
  renderOperatorPanel();
  updateSessionStatus();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: trimmed,
        history: historyForRequest,
        model: requestModelId,
      }),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    await streamAssistantReply(response, assistantMessage);
    assistantMessage.streaming = false;
    state.session = {
      phase: "complete",
    };
  } catch (error) {
    assistantMessage.streaming = false;
    applyAssistantFailure(
      assistantMessage,
      error instanceof Error ? error.message : "请求未完成，请稍后重试。",
    );
    state.session = {
      phase: "interrupted",
      hasPartialContent: Boolean(assistantMessage.failureNote),
    };
  } finally {
    state.isSending = false;
    assistantMessage.streaming = false;
    touchActiveSession();
    renderMessages();
    renderComposer();
    renderOperatorPanel();
    updateSessionStatus();
    elements.userInput.focus();
  }
}

function setSelectedModel(modelId, { closeCatalog = false } = {}) {
  if (!modelId || modelId === state.selectedModel) {
    return;
  }

  const nextModel = getAllModels().find((model) => model.id === modelId);

  if (!nextModel || state.isSending) {
    return;
  }

  state.selectedModel = nextModel.id;
  touchActiveSession({ preserveTitle: true });
  state.session = {
    phase: "model-selected",
    modelLabel: nextModel.label,
  };

  if (closeCatalog) {
    state.isCatalogOpen = false;
  }

  renderOperatorPanel();
  updateSessionStatus();
}

async function loadConfig() {
  const response = await fetch("/api/config", {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`配置加载失败（${response.status}）`);
  }

  state.config = await response.json();
}

function bindEvents() {
  elements.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void sendMessage(elements.userInput.value);
  });

  elements.userInput.addEventListener("input", () => {
    autoResizeTextarea();
    renderComposer();
  });

  elements.userInput.addEventListener("keydown", (event) => {
    if (
      shouldSubmitFromKeyboardEvent({
        key: event.key,
        shiftKey: event.shiftKey,
        isComposing: event.isComposing,
      })
    ) {
      event.preventDefault();
      void sendMessage(elements.userInput.value);
    }
  });

  elements.featuredModelList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-model-id]");

    if (!button) {
      return;
    }

    setSelectedModel(button.dataset.modelId);
  });

  elements.modelCatalogToggle.addEventListener("click", () => {
    if (state.isSending) {
      return;
    }

    state.isCatalogOpen = !state.isCatalogOpen;
    state.isSessionMenuOpen = false;
    renderOperatorPanel();

    if (state.isCatalogOpen) {
      requestAnimationFrame(() => {
        elements.modelSearchInput.focus();
      });
    }
  });

  elements.modelSearchInput.addEventListener("input", (event) => {
    state.modelCatalogQuery = event.target.value;
    renderModelCatalog();
  });

  elements.modelCatalogList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-model-id]");

    if (!button) {
      return;
    }

    setSelectedModel(button.dataset.modelId, { closeCatalog: true });
  });

  elements.sessionMenuToggle.addEventListener("click", () => {
    if (state.isSending) {
      return;
    }

    state.isSessionMenuOpen = !state.isSessionMenuOpen;
    state.isCatalogOpen = false;
    renderOperatorPanel();
  });

  elements.newChatButton.addEventListener("click", () => {
    if (state.isSending) {
      return;
    }

    createNewChatSession();
    state.session = {
      phase: "reset",
    };
    renderMessages();
    renderComposer();
    renderOperatorPanel();
    updateSessionStatus();
    elements.userInput.focus();
  });

  elements.sessionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-session-id]");

    if (!button || state.isSending) {
      return;
    }

    switchToSession(button.dataset.sessionId);
    state.session = {
      phase: "ready",
    };
    renderMessages();
    renderComposer();
    renderOperatorPanel();
    updateSessionStatus();
    elements.userInput.focus();
  });

  elements.clearAllSessionsButton.addEventListener("click", () => {
    if (state.isSending) {
      return;
    }

    const shouldClear =
      typeof window === "undefined"
        ? true
        : window.confirm("确定要清空全部本地对话吗？此操作无法撤销。");

    if (!shouldClear) {
      return;
    }

    clearAllLocalSessions();
    state.session = {
      phase: "reset",
    };
    renderMessages();
    renderComposer();
    renderOperatorPanel();
    updateSessionStatus();
    elements.userInput.focus();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#topBar")) {
      if (!state.isCatalogOpen && !state.isSessionMenuOpen) {
        return;
      }

      state.isCatalogOpen = false;
      state.isSessionMenuOpen = false;
      renderOperatorPanel();
    }
  });

  elements.chatHistory.addEventListener("click", async (event) => {
    const toggleButton = event.target.closest(".code-toggle-button");

    if (toggleButton) {
      toggleCodeBlockExpansion(toggleButton);
      return;
    }

    const button = event.target.closest(".code-copy-button");

    if (!button) {
      return;
    }

    const codeElement = button.closest(".code-block")?.querySelector("code");
    const codeText = codeElement?.textContent || "";

    if (!codeText.trim()) {
      return;
    }

    try {
      await copyTextToClipboard(codeText);
      updateCopyButtonState(button, "已复制");
    } catch {
      updateCopyButtonState(button, "复制失败");
    }
  });
}

async function initApp() {
  elements = {
    chatForm: document.getElementById("chatForm"),
    chatHistory: document.getElementById("chatHistory"),
    chatStatus: document.getElementById("chatStatus"),
    featuredModelList: document.getElementById("featuredModelList"),
    modelCatalogList: document.getElementById("modelCatalogList"),
    modelCatalogPanel: document.getElementById("modelCatalogPanel"),
    modelCatalogToggle: document.getElementById("modelCatalogToggle"),
    modelSearchInput: document.getElementById("modelSearchInput"),
    sendButton: document.getElementById("sendButton"),
    newChatButton: document.getElementById("newChatButton"),
    sessionList: document.getElementById("sessionList"),
    sessionMenuToggle: document.getElementById("sessionMenuToggle"),
    sessionMenuPanel: document.getElementById("sessionMenuPanel"),
    clearAllSessionsButton: document.getElementById("clearAllSessionsButton"),
    userInput: document.getElementById("userInput"),
  };

  bindEvents();
  autoResizeTextarea();
  updateSessionStatus();

  try {
    await loadConfig();
    renderShell();
    restoreLocalSessionStore();
    renderOperatorPanel();
    renderMessages();
    renderComposer();
    state.session = {
      phase: "ready",
    };
    updateSessionStatus();
    elements.userInput.focus();
  } catch (error) {
    state.session = {
      phase: "config-error",
    };
    updateSessionStatus();
    if (elements.chatHistory) {
      elements.chatHistory.innerHTML = `
        <section class="empty-state">
          <p class="section-label">Configuration Error</p>
          <h3>页面已加载，但运行配置未能初始化。</h3>
          <p>${escapeHtml(error instanceof Error ? error.message : "未知错误")}</p>
        </section>
      `;
    }
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void initApp();
}
