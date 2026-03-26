import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PREVIEW_PORT = 8967;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer(url, attempts = 30) {
  let lastError = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response;
      }

      lastError = new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(150);
  }

  throw lastError ?? new Error("Preview server did not start");
}

test("preview server exposes the current UI and mock chat endpoints without Wrangler", async () => {
  const child = spawn(process.execPath, ["scripts/preview.js", "--port", String(PREVIEW_PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
    },
    stdio: "ignore",
  });

  try {
    const configResponse = await waitForServer(
      `http://127.0.0.1:${PREVIEW_PORT}/api/config`,
    );
    const config = await configResponse.json();

    assert.equal(config.defaultModel, "@cf/zai-org/glm-4.7-flash");
    assert.ok(Array.isArray(config.featuredModels));
    assert.ok(Array.isArray(config.modelCatalog));
    assert.ok(config.modelCatalog.length >= 17);

    const pageResponse = await fetch(`http://127.0.0.1:${PREVIEW_PORT}/`);
    const pageHtml = await pageResponse.text();

    assert.match(pageHtml, /modelPicker/);
    assert.match(pageHtml, /sessionSidebar/);
    assert.match(pageHtml, /sessionSidebarToggle/);
    assert.match(pageHtml, /sessionSidebarCloseButton/);
    assert.match(pageHtml, /sessionSearchInput/);
    assert.match(pageHtml, /sessionSearchClearButton/);
    assert.match(pageHtml, /sessionSearchMeta/);
    assert.match(pageHtml, /newChatButton/);
    assert.doesNotMatch(pageHtml, /modelCatalogPreview/);
    assert.doesNotMatch(pageHtml, /page-orb/);

    const chatResponse = await fetch(`http://127.0.0.1:${PREVIEW_PORT}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "测试一下本地预览",
        history: [],
        model: "@cf/zai-org/glm-4.7-flash",
      }),
    });

    assert.equal(chatResponse.status, 200);
    assert.match(chatResponse.headers.get("content-type") || "", /text\/event-stream/);

    const chatText = await chatResponse.text();
    assert.match(chatText, /mock 响应|本地开发模式/);
    assert.match(chatText, /\[DONE\]/);
  } finally {
    child.kill("SIGTERM");
  }
});
