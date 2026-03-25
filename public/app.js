import {
  applyAssistantFailure,
  buildRequestHistory,
  consumeCompleteSseBlocks,
  consumeFinalSseBlock,
} from "./lib/chat-flow.js";
import {
  getHistoryRenderMode,
  snapshotHistoryForRender,
} from "./lib/chat-render.js";
import {
  formatAssistantTurnLabel,
  getControlState,
  getSessionStatus,
} from "./lib/ui-state.js";

const state = {
  config: null,
  history: [],
  selectedModel: null,
  isSending: false,
  session: {
    phase: "booting",
  },
};

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function renderMarkdown(markdown) {
  const parser = globalThis.marked;
  const purifier = globalThis.DOMPurify;

  try {
    const rawHtml = parser?.parse
      ? parser.parse(markdown, { gfm: true, breaks: true })
      : fallbackMarkdownToHtml(markdown);

    return purifier?.sanitize ? purifier.sanitize(rawHtml) : rawHtml;
  } catch {
    return fallbackMarkdownToHtml(markdown);
  }
}

function getSelectedModelMeta() {
  if (!state.config) {
    return null;
  }

  return (
    state.config.models.find((model) => model.id === state.selectedModel) ??
    state.config.models[0] ??
    null
  );
}

function isNearBottom(container) {
  const threshold = 140;
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <=
    threshold
  );
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
    180,
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
    return `${modelLabel} 正在生成，本轮已锁定模型，避免中途切换造成结果归属混乱。`;
  }

  if (state.session.phase === "interrupted" && state.session.hasPartialContent) {
    return "本轮生成已中断，但已保留部分内容。你可以继续追问，不必从头再来。";
  }

  if (state.session.phase === "interrupted") {
    return "本轮请求未成功返回内容，失败提示不会写回后续历史。";
  }

  if (state.session.phase === "complete") {
    return "本轮已完成，可以继续追问、改写输出，或切换模型做同题对比。";
  }

  if (state.session.phase === "model-selected") {
    return `${modelLabel} 已就绪。建议保持同一个任务不变，再切换模型做结果对比。`;
  }

  if (state.session.phase === "reset") {
    return "会话已清空，可以开始新的问题或新的工作流。";
  }

  if (state.history.length === 0) {
    return "从一个明确任务开始，系统会帮你保持稳定的会话上下文。";
  }

  return `当前会话已记录 ${state.history.length} 条消息，可围绕同一主题继续深入。`;
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
      label: "历史策略",
      value: "仅持久内容回传",
      detail:
        state.session.phase === "interrupted" && state.session.hasPartialContent
          ? "本轮已保留部分内容，可继续沿当前上下文追问"
          : "瞬时失败不会污染下一轮上下文",
      tone:
        state.session.phase === "interrupted" && state.session.hasPartialContent
          ? "warning"
          : "neutral",
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

function renderAssistantContent(message) {
  const contentHtml = message.streaming
    ? fallbackMarkdownToHtml(message.content)
    : renderMarkdown(message.content);
  const noteHtml = message.failureNote
    ? `<p><strong>系统提示：</strong>${escapeHtml(message.failureNote)}</p>`
    : "";

  return `${contentHtml}${noteHtml}`;
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

  return {
    cardClass: `message-card ${message.role}${message.error ? " error" : ""}`,
    roleLabel: message.role === "assistant" ? "AI" : "你",
    pillClass,
    pillText,
    contentHtml:
      message.role === "assistant"
        ? renderAssistantContent(message)
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
      <div class="message-content">${viewModel.contentHtml}</div>
    </article>
  `;
}

function patchMessageCard(cardElement, message) {
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

  cardElement.className = viewModel.cardClass;
  cardElement.dataset.streaming = message.streaming ? "true" : "false";
  roleElement.textContent = viewModel.roleLabel;
  pillElement.className = viewModel.pillClass;
  pillElement.textContent = viewModel.pillText;
  contentElement.innerHTML = viewModel.contentHtml;

  return true;
}

function patchLastAssistantMessage(message) {
  if (!elements?.chatHistory || message?.role !== "assistant") {
    return false;
  }

  return patchMessageCard(elements.chatHistory.lastElementChild, message);
}

function updateSessionStatus() {
  if (!elements) {
    return;
  }

  const { tone, message } = getSessionStatus(state.session);
  elements.chatStatus.dataset.state = tone;
  elements.chatStatus.textContent = message;
  if (elements.sessionSummary) {
    elements.sessionSummary.dataset.state = tone;
  }
  renderSessionSummary();
}

function renderShell() {
  if (!elements || !state.config) {
    return;
  }

  elements.appTitle.textContent = state.config.title;
  elements.appSubtitle.textContent = state.config.subtitle;
  elements.inputHint.textContent = state.config.inputHint;
  elements.workspaceBadges.innerHTML = (state.config.workspaceBadges ?? [])
    .map(
      (badge) => `
        <span class="badge" data-tone="${escapeHtml(badge.tone || "neutral")}">
          ${escapeHtml(badge.label)}
        </span>
      `,
    )
    .join("");
}

function renderModelMeta() {
  const model = getSelectedModelMeta();

  if (!model) {
    elements.modelMeta.innerHTML = "";
    return;
  }

  elements.modelMeta.innerHTML = `
    <h4>${escapeHtml(model.label)}</h4>
    <p>${escapeHtml(model.description)}</p>
    <div class="status-row">
      <span class="badge">${escapeHtml(model.speedTag)}</span>
      <span class="badge">${escapeHtml(model.costTag)}</span>
      <span class="badge">${escapeHtml(`${model.contextWindow.toLocaleString()} ctx`)}</span>
    </div>
    <p><strong>适合任务：</strong>${escapeHtml(model.recommendedFor)}</p>
  `;
}

function renderPromptCards() {
  const prompts = state.config?.starterPrompts ?? [];
  const disabledAttribute = state.isSending ? " disabled" : "";

  elements.starterPrompts.innerHTML = prompts
    .map((prompt, index) => {
      const promptButton = buildStarterPromptButtonModel(prompt, index);

      return `
        <button class="prompt-button" type="button" data-prompt="${escapeHtml(promptButton.dataPrompt)}"${disabledAttribute}>
          <strong>${escapeHtml(promptButton.title)}</strong>
          <span>${escapeHtml(promptButton.description)}</span>
        </button>
      `;
    })
    .join("");
}

function getMessageModelLabel(message) {
  if (typeof message.modelLabel === "string" && message.modelLabel.trim()) {
    return message.modelLabel;
  }

  if (!state.config) {
    return "AI 助手";
  }

  return (
    state.config.models.find((item) => item.id === message.modelId)?.label ??
    "AI 助手"
  );
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
        <p class="section-label">Ready To Explore</p>
        <h3>从一个明确任务开始，让模型更快进入状态。</h3>
        <p>
          你可以先用右侧快捷入口启动，也可以直接输入想法、代码需求、待整理文本
          或你正在处理的问题。
        </p>
      </section>
    `;
    lastRenderedHistorySnapshot = nextHistorySnapshot;
    return;
  }

  if (
    renderMode === "patch-last-assistant" &&
    patchLastAssistantMessage(state.history[state.history.length - 1])
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

function renderModelSelect() {
  const models = state.config?.models ?? [];

  elements.modelSelect.innerHTML = models
    .map(
      (model) => `
        <option value="${escapeHtml(model.id)}">
          ${escapeHtml(formatModelLabel(model))}
        </option>
      `,
    )
    .join("");

  if (state.selectedModel) {
    elements.modelSelect.value = state.selectedModel;
  }
}

function renderOperatorPanel() {
  if (!elements || !state.config) {
    return;
  }

  const controlState = getCurrentControlState();
  renderModelSelect();
  renderModelMeta();
  renderPromptCards();
  elements.modelSelect.disabled = controlState.modelDisabled;
}

function renderComposer() {
  if (!elements) {
    return;
  }

  const controlState = getCurrentControlState();
  elements.sendButton.disabled = controlState.sendDisabled;
  elements.userInput.disabled = controlState.inputDisabled;
  elements.resetButton.disabled = controlState.resetDisabled;
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
    renderMessages();
    renderComposer();
    renderOperatorPanel();
    updateSessionStatus();
    elements.userInput.focus();
  }
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
  state.selectedModel =
    state.config.defaultModel || state.config.models?.[0]?.id || null;
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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(elements.userInput.value);
    }
  });

  elements.modelSelect.addEventListener("change", (event) => {
    state.selectedModel = event.target.value;
    state.session = {
      phase: "model-selected",
      modelLabel: getSelectedModelMeta()?.label || "当前模型",
    };
    renderOperatorPanel();
    updateSessionStatus();
  });

  elements.starterPrompts.addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt]");

    if (!button || state.isSending) {
      return;
    }

    elements.userInput.value = readStarterPromptSelection(button);
    autoResizeTextarea();
    renderComposer();
    elements.userInput.focus();
  });

  elements.resetButton.addEventListener("click", () => {
    if (state.isSending) {
      return;
    }

    state.history = [];
    state.session = {
      phase: "reset",
    };
    renderMessages();
    renderComposer();
    updateSessionStatus();
    elements.userInput.focus();
  });
}

async function initApp() {
  elements = {
    appTitle: document.getElementById("appTitle"),
    appSubtitle: document.getElementById("appSubtitle"),
    chatForm: document.getElementById("chatForm"),
    chatHistory: document.getElementById("chatHistory"),
    chatStatus: document.getElementById("chatStatus"),
    inputHint: document.getElementById("inputHint"),
    modelMeta: document.getElementById("modelMeta"),
    modelSelect: document.getElementById("modelSelect"),
    resetButton: document.getElementById("resetButton"),
    sendButton: document.getElementById("sendButton"),
    sessionHeadline: document.getElementById("sessionHeadline"),
    sessionMeta: document.getElementById("sessionMeta"),
    sessionSummary: document.getElementById("sessionSummary"),
    starterPrompts: document.getElementById("starterPrompts"),
    userInput: document.getElementById("userInput"),
    workspaceBadges: document.getElementById("workspaceBadges"),
  };

  bindEvents();
  autoResizeTextarea();
  updateSessionStatus();

  try {
    await loadConfig();
    renderShell();
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
