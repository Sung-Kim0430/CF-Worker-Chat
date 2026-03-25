const state = {
  config: null,
  history: [],
  selectedModel: null,
  isSending: false,
};

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
});

let elements = null;
let renderQueued = false;

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

function escapeHtml(value) {
  return value
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

function setStatus(message, tone = "idle") {
  if (!elements) {
    return;
  }

  elements.chatStatus.dataset.state = tone;
  elements.chatStatus.textContent = message;
}

function isNearBottom(container) {
  const threshold = 140;
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <=
    threshold
  );
}

function scheduleRender() {
  if (renderQueued || !elements) {
    return;
  }

  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderApp();
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

  elements.starterPrompts.innerHTML = prompts
    .map((prompt, index) => {
      const promptCard = normalizeStarterPrompt(prompt, index);

      return `
        <button class="prompt-button" type="button" data-prompt="${escapeHtml(promptCard.prompt)}">
          <strong>${escapeHtml(promptCard.title)}</strong>
          <span>${escapeHtml(promptCard.description)}</span>
        </button>
      `;
    })
    .join("");
}

function renderHistory() {
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
      const modelMeta =
        message.role === "assistant" && state.config
          ? state.config.models.find((item) => item.id === message.modelId)
          : null;
      const toneClass = message.error ? " error" : "";
      const messageHtml =
        message.role === "assistant"
          ? renderMarkdown(message.content)
          : `<p>${escapeHtml(message.content)}</p>`;

      return `
        <article class="message-card ${message.role}${toneClass}">
          <div class="message-meta">
            <span class="message-role">${message.role === "assistant" ? "AI 助手" : "你"}</span>
            <span class="message-pill">
              ${
                message.streaming
                  ? '<span class="streaming-dot">生成中</span>'
                  : escapeHtml(
                      modelMeta ? modelMeta.label : timeFormatter.format(message.createdAt),
                    )
              }
            </span>
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

function renderApp() {
  if (!elements || !state.config) {
    return;
  }

  elements.appTitle.textContent = state.config.title;
  elements.appSubtitle.textContent = state.config.subtitle;
  elements.inputHint.textContent = state.config.inputHint;
  renderModelSelect();
  renderModelMeta();
  renderPromptCards();
  renderHistory();

  const canSend = !state.isSending && elements.userInput.value.trim().length > 0;
  elements.sendButton.disabled = !canSend;
  elements.userInput.disabled = state.isSending;
  elements.resetButton.disabled = state.isSending || state.history.length === 0;
}

function extractTextFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if (payload.error) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : payload.error.message || "模型返回了错误事件";
    throw new Error(message);
  }

  if (typeof payload.response === "string") {
    return payload.response;
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const choice = payload.choices?.[0];

  if (typeof choice?.delta?.content === "string") {
    return choice.delta.content;
  }

  if (Array.isArray(choice?.delta?.content)) {
    return choice.delta.content
      .map((part) => part?.text ?? "")
      .join("");
  }

  if (typeof choice?.message?.content === "string") {
    return choice.message.content;
  }

  if (typeof choice?.text === "string") {
    return choice.text;
  }

  return "";
}

function consumeSseBlock(block, assistantMessage) {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  if (!data) {
    return false;
  }

  if (data === "[DONE]") {
    return true;
  }

  try {
    const payload = JSON.parse(data);
    const text = extractTextFromPayload(payload);

    if (text) {
      assistantMessage.content += text;
      scheduleRender();
    }
  } catch {
    assistantMessage.content += data;
    scheduleRender();
  }

  return false;
}

async function streamAssistantReply(response, assistantMessage) {
  if (!response.body) {
    throw new Error("响应体为空，无法读取模型输出。");
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/event-stream")) {
    const text = await response.text();
    assistantMessage.content = text;
    scheduleRender();
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

    buffer += value.replaceAll("\r\n", "\n");

    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      completed = consumeSseBlock(block, assistantMessage);

      if (completed) {
        break;
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  if (!assistantMessage.content.trim()) {
    assistantMessage.content = "模型未返回可显示内容，请尝试换个问题或切换模型。";
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
  const historyForRequest = state.history.map(({ role, content }) => ({
    role,
    content,
  }));

  const userMessage = {
    role: "user",
    content: trimmed,
    createdAt: Date.now(),
  };
  const assistantMessage = {
    role: "assistant",
    content: "",
    modelId: selectedModel?.id || state.selectedModel,
    createdAt: Date.now(),
    streaming: true,
    error: false,
  };

  state.history.push(userMessage, assistantMessage);
  state.isSending = true;
  elements.userInput.value = "";
  autoResizeTextarea();
  setStatus(`正在使用 ${selectedModel?.label || "当前模型"} 生成回答...`, "loading");
  renderApp();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: trimmed,
        history: historyForRequest,
        model: state.selectedModel,
      }),
    });

    if (!response.ok) {
      let errorMessage = `请求失败（${response.status}）`;

      try {
        const payload = await response.json();
        errorMessage = payload.error?.message || errorMessage;
      } catch {
        errorMessage = await response.text();
      }

      throw new Error(errorMessage);
    }

    await streamAssistantReply(response, assistantMessage);
    assistantMessage.streaming = false;
    setStatus("已完成响应，可以继续追问或切换模型。", "idle");
  } catch (error) {
    assistantMessage.streaming = false;
    assistantMessage.error = true;
    assistantMessage.content =
      error instanceof Error
        ? `请求未完成：${error.message}`
        : "请求未完成，请稍后重试。";
    setStatus("请求失败，请检查配置或切换模型后重试。", "error");
  } finally {
    state.isSending = false;
    assistantMessage.streaming = false;
    renderApp();
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
  state.selectedModel = state.config.defaultModel;
}

function bindEvents() {
  elements.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void sendMessage(elements.userInput.value);
  });

  elements.userInput.addEventListener("input", () => {
    autoResizeTextarea();
    renderApp();
  });

  elements.userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(elements.userInput.value);
    }
  });

  elements.modelSelect.addEventListener("change", (event) => {
    state.selectedModel = event.target.value;
    renderModelMeta();
    setStatus(`已切换到 ${getSelectedModelMeta()?.label || "当前模型"}`, "idle");
  });

  elements.starterPrompts.addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt]");

    if (!button) {
      return;
    }

    elements.userInput.value = button.dataset.prompt || "";
    autoResizeTextarea();
    renderApp();
    elements.userInput.focus();
  });

  elements.resetButton.addEventListener("click", () => {
    state.history = [];
    setStatus("已清空当前会话，可以开始新的演示。", "idle");
    renderApp();
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
  setStatus("正在加载模型配置...", "loading");

  try {
    await loadConfig();
    renderApp();
    setStatus("准备就绪，可以直接开始提问。", "idle");
    elements.userInput.focus();
  } catch (error) {
    setStatus("配置加载失败，请检查 Worker 和 AI 绑定配置。", "error");
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
