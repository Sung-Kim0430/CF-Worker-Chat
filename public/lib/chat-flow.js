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
    return choice.delta.content.map((part) => part?.text ?? "").join("");
  }

  if (typeof choice?.message?.content === "string") {
    return choice.message.content;
  }

  if (typeof choice?.text === "string") {
    return choice.text;
  }

  return "";
}

function consumeSsePayload(data, onText) {
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
      onText(text);
    }
  } catch {
    onText(data);
  }

  return false;
}

function consumeSseBlock(block, onText) {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  return consumeSsePayload(data, onText);
}

export function consumeCompleteSseBlocks(buffer, onText) {
  let remaining = String(buffer ?? "").replaceAll("\r\n", "\n");
  let done = false;
  let boundary = remaining.indexOf("\n\n");

  while (boundary !== -1) {
    const block = remaining.slice(0, boundary);
    remaining = remaining.slice(boundary + 2);
    done = consumeSseBlock(block, onText);

    if (done) {
      break;
    }

    boundary = remaining.indexOf("\n\n");
  }

  return {
    buffer: remaining,
    done,
  };
}

export function consumeFinalSseBlock(buffer, onText) {
  const finalBlock = String(buffer ?? "").replaceAll("\r\n", "\n").trim();

  if (!finalBlock) {
    return false;
  }

  return consumeSseBlock(finalBlock, onText);
}

export function buildRequestHistory(history) {
  return history
    .filter((item) => item.includeInHistory !== false)
    .map(({ role, content }) => ({ role, content }));
}

export function applyAssistantFailure(message, errorText) {
  if (message.content.trim()) {
    message.failureNote = errorText;
    message.error = true;
    message.includeInHistory = true;
    return message;
  }

  message.content = `请求未完成：${errorText}`;
  message.error = true;
  message.includeInHistory = false;
  return message;
}
