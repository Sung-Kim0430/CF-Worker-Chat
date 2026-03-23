import { DEFAULT_MODEL, isSupportedModel } from "./models.js";

const MAX_HISTORY_MESSAGES = 12;
const MAX_CONTENT_LENGTH = 12000;
const VALID_ROLES = new Set(["user", "assistant"]);

function normalizeHistoryItem(item) {
  if (!item || typeof item !== "object") {
    throw new Error("History items must be objects");
  }

  if (!VALID_ROLES.has(item.role)) {
    throw new Error("History role is invalid");
  }

  if (typeof item.content !== "string" || !item.content.trim()) {
    throw new Error("History content is invalid");
  }

  if (item.content.length > MAX_CONTENT_LENGTH) {
    throw new Error("History content is too long");
  }

  return {
    role: item.role,
    content: item.content.trim(),
  };
}

export function normalizeChatRequest(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body is required");
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new Error("Message is required");
  }

  if (!Array.isArray(body.history)) {
    throw new Error("History must be an array");
  }

  if (body.message.length > MAX_CONTENT_LENGTH) {
    throw new Error("Message is too long");
  }

  const model = body.model || DEFAULT_MODEL;

  if (!isSupportedModel(model)) {
    throw new Error("Unsupported model");
  }

  const history = body.history
    .slice(-MAX_HISTORY_MESSAGES)
    .map(normalizeHistoryItem);

  return {
    message: body.message.trim(),
    history,
    model,
  };
}
