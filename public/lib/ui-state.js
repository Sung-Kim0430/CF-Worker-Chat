export function getControlState({
  isSending = false,
  hasHistory = false,
  hasInput = false,
} = {}) {
  return {
    sendDisabled: Boolean(isSending) || !Boolean(hasInput),
    inputDisabled: Boolean(isSending),
    modelDisabled: Boolean(isSending),
    resetDisabled: Boolean(isSending) || !Boolean(hasHistory),
  };
}

export function formatAssistantTurnLabel({
  streaming = false,
  modelLabel = "",
  fallbackLabel = "",
  stateLabel = "",
} = {}) {
  const resolvedLabel = modelLabel || fallbackLabel || "AI 助手";

  if (!modelLabel) {
    return resolvedLabel;
  }

  if (streaming) {
    return `${resolvedLabel} · 生成中`;
  }

  if (stateLabel && stateLabel !== "已完成") {
    return `${resolvedLabel} · ${stateLabel}`;
  }

  return resolvedLabel;
}

export function getSessionStatus({
  phase = "ready",
  hasPartialContent = false,
  modelLabel,
} = {}) {
  if (phase === "booting") {
    return { tone: "loading", message: "正在加载模型配置..." };
  }

  if (phase === "sending") {
    return {
      tone: "loading",
      message: `正在使用 ${modelLabel || "当前模型"} 生成回答...`,
    };
  }

  if (phase === "complete") {
    return { tone: "idle", message: "已完成响应，可以继续追问或切换模型。" };
  }

  if (phase === "interrupted" && hasPartialContent) {
    return { tone: "warning", message: "生成已中断，已保留部分内容。" };
  }

  if (phase === "interrupted") {
    return { tone: "error", message: "请求失败，请检查配置或切换模型后重试。" };
  }

  if (phase === "reset") {
    return { tone: "idle", message: "已清空当前会话，可以开始新的任务。" };
  }

  if (phase === "model-selected") {
    return {
      tone: "idle",
      message: `已切换到 ${modelLabel || "当前模型"}`,
    };
  }

  if (phase === "config-error") {
    return {
      tone: "error",
      message: "配置加载失败，请检查 Worker 和 AI 绑定配置。",
    };
  }

  return { tone: "idle", message: "准备就绪，可以直接开始提问。" };
}
