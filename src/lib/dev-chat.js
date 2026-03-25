import { getModelById } from "./models.js";

const LOCAL_DEV_HOSTS = new Set(["127.0.0.1", "localhost"]);
const STREAM_CHUNK_SIZE = 56;

function buildLocalDevReply({ message, model }) {
  const modelMeta = getModelById(model);
  const modelLabel = modelMeta?.label || model || "当前模型";

  return [
    "本地开发模式已启用 mock 响应，当前未连接远端 Workers AI。",
    `当前模型：${modelLabel}。`,
    `你刚才的问题是：${message}`,
    "如果要验证真实模型输出，请改用 `npm run dev:remote` 并完成 Cloudflare 登录。",
  ].join("\n\n");
}

function* chunkText(text, size = STREAM_CHUNK_SIZE) {
  for (let index = 0; index < text.length; index += size) {
    yield text.slice(index, index + size);
  }
}

export function shouldUseLocalDevMock(url) {
  return LOCAL_DEV_HOSTS.has(url.hostname);
}

export function shouldFallbackFromLocalAiError(error) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return /run remotely/i.test(message) || /not supported.*local/i.test(message);
}

export function buildLocalDevChatStream(payload) {
  const encoder = new TextEncoder();
  const reply = buildLocalDevReply(payload);

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunkText(reply)) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ response: chunk })}\n\n`),
        );
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}
