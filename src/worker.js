import { buildMessages, normalizeChatRequest } from "./lib/chat.js";
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

    if (url.pathname === "/api/config" && request.method === "GET") {
      return json(buildClientConfig());
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const payload = normalizeChatRequest(await parseJson(request));

        if (!env.AI || typeof env.AI.run !== "function") {
          return errorResponse(
            500,
            "Workers AI binding is missing. Configure the AI binding in wrangler before deploying.",
            "missing_ai_binding",
          );
        }

        const stream = await env.AI.run(payload.model, {
          messages: buildMessages(payload),
          stream: true,
        });

        return eventStream(stream);
      } catch (error) {
        if (error instanceof Error) {
          return errorResponse(400, error.message, "invalid_chat_request");
        }

        return errorResponse(500, "Unknown chat request failure", "chat_request_error");
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return errorResponse(404, "API route not found", "not_found");
    }

    return serveStaticAsset(request, env);
  },
};
