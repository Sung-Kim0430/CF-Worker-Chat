export const LOCAL_SESSION_STORAGE_KEY = "cf-worker-chat.local-sessions.v1";
export const MAX_LOCAL_SESSIONS = 20;
export const MAX_SESSION_MESSAGES = 100;
const DEFAULT_SESSION_TITLE = "新对话";

function resolveNow(now = Date.now) {
  return typeof now === "function" ? Number(now()) : Number(now);
}

function clampTimestamp(value, fallback) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback;
}

function normalizeExpandedCodeBlocks(expandedCodeBlocks = {}) {
  if (!expandedCodeBlocks || typeof expandedCodeBlocks !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(expandedCodeBlocks).filter(
      ([key, value]) => typeof key === "string" && key && Boolean(value),
    ),
  );
}

function normalizeMessage(message = {}) {
  if (!message || typeof message !== "object") {
    return null;
  }

  if (typeof message.role !== "string" || typeof message.content !== "string") {
    return null;
  }

  const normalized = {
    role: message.role,
    content: message.content,
  };

  if (message.modelId) {
    normalized.modelId = String(message.modelId);
  }

  if (message.modelLabel) {
    normalized.modelLabel = String(message.modelLabel);
  }

  if (message.failureNote) {
    normalized.failureNote = String(message.failureNote);
  }

  if ("createdAt" in message) {
    normalized.createdAt = clampTimestamp(message.createdAt, 0);
  }

  if ("streaming" in message) {
    normalized.streaming = Boolean(message.streaming);
  }

  if ("error" in message) {
    normalized.error = Boolean(message.error);
  }

  return normalized;
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map(normalizeMessage)
    .filter(Boolean)
    .slice(-MAX_SESSION_MESSAGES);
}

export function buildSessionTitle(history = [], fallback = DEFAULT_SESSION_TITLE, maxLength = 24) {
  const sourceMessage = history.find(
    (message) => message?.role === "user" && typeof message.content === "string" && message.content.trim(),
  ) ?? history.find(
    (message) => typeof message?.content === "string" && message.content.trim(),
  );

  const normalized = sourceMessage?.content
    ?.replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

function normalizeModelId(modelId, defaultModelId, availableModelIds = []) {
  const normalized = typeof modelId === "string" && modelId.trim() ? modelId : "";
  const available = Array.isArray(availableModelIds) ? availableModelIds.filter(Boolean) : [];

  if (!normalized) {
    return defaultModelId;
  }

  if (available.length === 0 || available.includes(normalized)) {
    return normalized;
  }

  return defaultModelId;
}

export function createEmptySession(defaultModelId, now = Date.now) {
  const timestamp = resolveNow(now);

  return {
    id: `session-${timestamp}`,
    title: DEFAULT_SESSION_TITLE,
    createdAt: timestamp,
    updatedAt: timestamp,
    history: [],
    modelId: defaultModelId,
    expandedCodeBlocks: {},
  };
}

export function normalizeSession(
  session = {},
  { defaultModelId, availableModelIds = [], now = Date.now } = {},
) {
  const timestamp = resolveNow(now);
  const history = normalizeHistory(session.history);
  const createdAt = clampTimestamp(session.createdAt, timestamp);
  const updatedAt = clampTimestamp(
    session.updatedAt,
    history.at(-1)?.createdAt || createdAt,
  );

  return {
    id:
      typeof session.id === "string" && session.id.trim()
        ? session.id
        : `session-${timestamp}`,
    title:
      typeof session.title === "string" && session.title.trim()
        ? session.title
        : buildSessionTitle(history),
    createdAt,
    updatedAt,
    history,
    modelId: normalizeModelId(session.modelId, defaultModelId, availableModelIds),
    expandedCodeBlocks: normalizeExpandedCodeBlocks(session.expandedCodeBlocks),
  };
}

export function sortSessionsByUpdatedAt(sessions = []) {
  return [...sessions].sort((left, right) => {
    const updatedDelta = Number(right.updatedAt || 0) - Number(left.updatedAt || 0);

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return Number(right.createdAt || 0) - Number(left.createdAt || 0);
  });
}

function trimSessions(sessions = [], maxSessions = MAX_LOCAL_SESSIONS) {
  return sortSessionsByUpdatedAt(sessions).slice(0, maxSessions);
}

export function clearAllSessions({ defaultModelId, now = Date.now } = {}) {
  const session = createEmptySession(defaultModelId, now);

  return {
    activeSessionId: session.id,
    sessions: [session],
  };
}

export function buildInitialSessionStore({
  defaultModelId,
  availableModelIds = [],
  storageValue = "",
  now = Date.now,
} = {}) {
  if (!defaultModelId) {
    throw new Error("default_model_required");
  }

  let parsed = null;

  try {
    parsed = typeof storageValue === "string" && storageValue.trim()
      ? JSON.parse(storageValue)
      : null;
  } catch {
    parsed = null;
  }

  if (!parsed || !Array.isArray(parsed.sessions)) {
    return clearAllSessions({ defaultModelId, now });
  }

  const sessions = trimSessions(
    parsed.sessions
      .map((session) =>
        normalizeSession(session, {
          defaultModelId,
          availableModelIds,
          now,
        }),
      )
      .filter(Boolean),
  );

  if (sessions.length === 0) {
    return clearAllSessions({ defaultModelId, now });
  }

  const activeSessionId = sessions.some((session) => session.id === parsed.activeSessionId)
    ? parsed.activeSessionId
    : sessions[0].id;

  return {
    activeSessionId,
    sessions,
  };
}

export function serializeSessionStore(store = {}) {
  return JSON.stringify({
    activeSessionId: store.activeSessionId || "",
    sessions: trimSessions(Array.isArray(store.sessions) ? store.sessions : []).map((session) =>
      normalizeSession(session, {
        defaultModelId: session.modelId || "",
      }),
    ),
  });
}

export function persistSessionStore(storage, store = {}) {
  if (!storage || typeof storage.setItem !== "function") {
    return false;
  }

  try {
    storage.setItem(LOCAL_SESSION_STORAGE_KEY, serializeSessionStore(store));
    return true;
  } catch {
    return false;
  }
}

export function restoreSessionStore(storage, options = {}) {
  if (!storage || typeof storage.getItem !== "function") {
    return clearAllSessions(options);
  }

  try {
    return buildInitialSessionStore({
      ...options,
      storageValue: storage.getItem(LOCAL_SESSION_STORAGE_KEY) || "",
    });
  } catch {
    return clearAllSessions(options);
  }
}

export function createNextSessionStore(store = {}, { defaultModelId, now = Date.now } = {}) {
  const nextSession = createEmptySession(defaultModelId, now);
  const sessions = trimSessions([nextSession, ...(store.sessions || [])]);

  return {
    activeSessionId: nextSession.id,
    sessions,
  };
}

export function setActiveSessionId(store = {}, sessionId = "") {
  if (!(store.sessions || []).some((session) => session.id === sessionId)) {
    return store;
  }

  return {
    ...store,
    activeSessionId: sessionId,
  };
}

export function replaceSession(store = {}, nextSession = {}) {
  const nextSessions = Array.isArray(store.sessions) ? [...store.sessions] : [];
  const index = nextSessions.findIndex((session) => session.id === nextSession.id);

  if (index === -1) {
    nextSessions.unshift(nextSession);
  } else {
    nextSessions[index] = nextSession;
  }

  return {
    activeSessionId: store.activeSessionId || nextSession.id,
    sessions: trimSessions(nextSessions),
  };
}
