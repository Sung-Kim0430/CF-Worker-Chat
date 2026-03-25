import { buildMessages, normalizeChatRequest } from "./lib/chat.js";
import {
  buildLocalDevChatStream,
  shouldFallbackFromLocalAiError,
  shouldUseLocalDevMock,
} from "./lib/dev-chat.js";
import { errorResponse, eventStream, json } from "./lib/http.js";
import { buildClientConfig } from "./lib/models.js";
import { serveStaticAsset } from "./lib/static.js";

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const useLocalDevMock = shouldUseLocalDevMock(url);

    if (url.pathname === "/api/config" && request.method === "GET") {
      return json(buildClientConfig());
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      let payload;

      try {
        payload = normalizeChatRequest(await parseJson(request));
      } catch (error) {
        return errorResponse(
          400,
          error instanceof Error ? error.message : "Invalid chat request",
          "invalid_chat_request",
        );
      }

      if ((!env.AI || typeof env.AI.run !== "function") && useLocalDevMock) {
        return eventStream(buildLocalDevChatStream(payload));
      }

      if (!env.AI || typeof env.AI.run !== "function") {
        return errorResponse(
          500,
          "Workers AI binding is missing. Configure the AI binding in wrangler before deploying.",
          "missing_ai_binding",
        );
      }

      try {
        const stream = await env.AI.run(payload.model, {
          messages: buildMessages(payload),
          stream: true,
        });

        return eventStream(stream);
      } catch (error) {
        if (useLocalDevMock && shouldFallbackFromLocalAiError(error)) {
          return eventStream(buildLocalDevChatStream(payload));
        }

        return errorResponse(
          502,
          error instanceof Error
            ? error.message
            : "The selected model failed during inference.",
          "model_inference_failed",
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return errorResponse(404, "API route not found", "not_found");
    }

    return serveStaticAsset(request, env);
  },
};
