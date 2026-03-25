import {
  applyAssistantFailure,
  buildRequestHistory,
  consumeCompleteSseBlocks,
  consumeFinalSseBlock,
} from "./lib/chat-flow.js";
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

  elements.appTitle.textContent = state.config.title;
  elements.appSubtitle.textContent = state.config.subtitle;
  elements.inputHint.textContent = state.config.inputHint;
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
    <p><strong>推荐场景：</strong>${escapeHtml(model.recommendedFor)}</p>
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

  if (state.history.length === 0) {
    elements.chatHistory.innerHTML = `
      <section class="empty-state">
        <p class="section-label">Ready To Demo</p>
        <h3>从一个明确的问题开始，让模型更快进入状态。</h3>
        <p>
          你可以先用右侧推荐问题快速启动，也可以直接输入客户痛点、售前场景、
          产品介绍或知识问答需求。
        </p>
      </section>
    `;
    return;
  }

  elements.chatHistory.innerHTML = state.history
    .map((message) => {
      const toneClass = message.error ? " error" : "";
      const noteHtml =
        message.role === "assistant" && message.failureNote
          ? `<p><strong>系统提示：</strong>${escapeHtml(message.failureNote)}</p>`
          : "";
      const messageHtml =
        message.role === "assistant"
          ? `${renderMarkdown(message.content)}${noteHtml}`
          : `<p>${escapeHtml(message.content)}</p>`;
      const pillText =
        message.role === "assistant"
          ? formatAssistantTurnLabel({
              streaming: message.streaming,
              modelLabel: getMessageModelLabel(message),
              fallbackLabel: timeFormatter.format(message.createdAt),
              stateLabel: getAssistantMessageStateLabel(message),
            })
          : timeFormatter.format(message.createdAt);

      return `
        <article class="message-card ${message.role}${toneClass}">
          <div class="message-meta">
            <span class="message-role">${message.role === "assistant" ? "AI 助手" : "你"}</span>
            <span class="message-pill">${escapeHtml(pillText)}</span>
          </div>
          <div class="message-content">${messageHtml}</div>
        </article>
      `;
    })
    .join("");

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
    starterPrompts: document.getElementById("starterPrompts"),
    userInput: document.getElementById("userInput"),
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
