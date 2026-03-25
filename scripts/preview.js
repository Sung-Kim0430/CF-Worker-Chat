import http from "node:http";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { readFile } from "node:fs/promises";
import { buildClientConfig } from "../src/lib/models.js";
import { normalizeChatRequest } from "../src/lib/chat.js";
import { buildLocalDevChatStream } from "../src/lib/dev-chat.js";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function getArgValue(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function getPreferredPort() {
  const raw =
    getArgValue("--port") ??
    process.env.PORT ??
    "8787";
  const port = Number.parseInt(raw, 10);

  return Number.isFinite(port) && port > 0 ? port : 8787;
}

function getHost() {
  return getArgValue("--host") ?? process.env.HOST ?? "127.0.0.1";
}

function getStaticFilePath(urlPathname) {
  const pathname = urlPathname === "/" ? "/index.html" : urlPathname;
  const normalizedPath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return path.resolve(process.cwd(), "public", `.${normalizedPath}`);
}

async function readStaticAsset(urlPathname) {
  const filePath = getStaticFilePath(urlPathname);
  const extension = path.extname(filePath).toLowerCase();
  const body = await readFile(filePath);

  return {
    body,
    contentType: MIME_TYPES[extension] || "application/octet-stream",
  };
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(message);
}

async function pipeReadableStreamToResponse(stream, response) {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      response.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  response.end();
}

async function handleApiRequest(request, response, url) {
  if (url.pathname === "/api/config" && request.method === "GET") {
    sendJson(response, 200, buildClientConfig());
    return true;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    const config = buildClientConfig();

    sendJson(response, 200, {
      mode: "ui-preview",
      title: config.title,
      defaultModel: config.defaultModel,
      featuredCount: config.featuredModels.length,
      catalogCount: config.modelCatalog.length,
    });
    return true;
  }

  if (url.pathname === "/api/chat" && request.method === "POST") {
    let payload;

    try {
      payload = normalizeChatRequest(await readJsonBody(request));
    } catch (error) {
      sendJson(response, 400, {
        error: {
          code: "invalid_chat_request",
          message: error instanceof Error ? error.message : "Invalid chat request",
        },
      });
      return true;
    }

    response.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
    });

    await pipeReadableStreamToResponse(buildLocalDevChatStream(payload), response);
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, {
      error: {
        code: "not_found",
        message: "API route not found",
      },
    });
    return true;
  }

  return false;
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

  if (await handleApiRequest(request, response, url)) {
    return;
  }

  try {
    const asset = await readStaticAsset(url.pathname);
    response.writeHead(200, {
      "content-type": asset.contentType,
      "cache-control": "no-store",
    });
    response.end(asset.body);
  } catch (error) {
    if (url.pathname !== "/index.html" && url.pathname !== "/") {
      sendText(response, 404, "Not found");
      return;
    }

    sendText(
      response,
      500,
      error instanceof Error ? error.message : "Failed to load preview asset",
    );
  }
}

function checkPortAvailable(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", () => {
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, host);
  });
}

async function findAvailablePort(preferredPort, host, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = preferredPort + offset;
    const available = await checkPortAvailable(candidate, host);

    if (available) {
      return candidate;
    }
  }

  throw new Error(`Unable to find an open port starting from ${preferredPort}`);
}

const host = getHost();
const preferredPort = getPreferredPort();
const port = await findAvailablePort(preferredPort, host);
const config = buildClientConfig();

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    sendText(
      response,
      500,
      error instanceof Error ? error.message : "Preview server error",
    );
  });
});

server.listen(port, host, () => {
  process.stdout.write(
    [
      `CF Worker Chat UI preview running at http://${host}:${port}`,
      "说明：这是一个不依赖 Wrangler 的稳定本地预览，用于确认你看到的是当前前端。",
      `当前应能看到：查看全部 ${config.modelCatalog.length} 个模型`,
      `以及：还有 ${Math.max(config.modelCatalog.length - config.featuredModels.length, 0)} 个模型 ...`,
    ].join("\n") + "\n",
  );
});

function shutdown(signal) {
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(0);
  }, 500).unref();

  if (signal) {
    process.stdout.write(`收到 ${signal}，正在关闭 UI preview...\n`);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
