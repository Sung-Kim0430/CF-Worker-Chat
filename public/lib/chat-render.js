function normalizeMessageSnapshot(message = {}) {
  return {
    role: message.role || "",
    content: message.content || "",
    modelId: message.modelId || "",
    modelLabel: message.modelLabel || "",
    createdAt: Number(message.createdAt || 0),
    streaming: Boolean(message.streaming),
    error: Boolean(message.error),
    failureNote: message.failureNote || "",
  };
}

function isSameMessage(left, right) {
  return (
    left.role === right.role &&
    left.content === right.content &&
    left.modelId === right.modelId &&
    left.modelLabel === right.modelLabel &&
    left.createdAt === right.createdAt &&
    left.streaming === right.streaming &&
    left.error === right.error &&
    left.failureNote === right.failureNote
  );
}

export function snapshotHistoryForRender(history = []) {
  return history.map((message) => normalizeMessageSnapshot(message));
}

export function getHistoryRenderMode(previousHistory = [], nextHistory = []) {
  if (previousHistory.length === 0 && nextHistory.length === 0) {
    return "noop";
  }

  if (previousHistory.length !== nextHistory.length || nextHistory.length === 0) {
    return "rerender";
  }

  const lastIndex = nextHistory.length - 1;
  const previousLast = previousHistory[lastIndex];
  const nextLast = nextHistory[lastIndex];

  if (!previousLast || !nextLast) {
    return "rerender";
  }

  for (let index = 0; index < lastIndex; index += 1) {
    if (!isSameMessage(previousHistory[index], nextHistory[index])) {
      return "rerender";
    }
  }

  if (
    previousLast.role !== "assistant" ||
    nextLast.role !== "assistant" ||
    previousLast.createdAt !== nextLast.createdAt ||
    previousLast.modelId !== nextLast.modelId ||
    previousLast.modelLabel !== nextLast.modelLabel
  ) {
    return "rerender";
  }

  if (isSameMessage(previousLast, nextLast)) {
    return "noop";
  }

  return "patch-last-assistant";
}


export function getMessagePatchMode(previousMessage = {}, nextMessage = {}) {
  const previous = normalizeMessageSnapshot(previousMessage);
  const next = normalizeMessageSnapshot(nextMessage);

  if (isSameMessage(previous, next)) {
    return "noop";
  }

  if (previous.role !== "assistant" || next.role !== "assistant") {
    return "replace-card";
  }

  if (
    previous.createdAt !== next.createdAt ||
    previous.modelId !== next.modelId ||
    previous.modelLabel !== next.modelLabel
  ) {
    return "replace-card";
  }

  if (
    previous.streaming &&
    next.streaming &&
    !previous.error &&
    !next.error &&
    previous.failureNote === next.failureNote
  ) {
    return "streaming-content-only";
  }

  return "replace-card";
}
