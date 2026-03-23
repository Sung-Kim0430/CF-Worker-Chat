# Workers AI Chat Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the prototype into a standard Cloudflare Worker app with a polished chat UI, stable Workers AI streaming, GLM-4.7-Flash as the default model, and maintainable project documentation.

**Architecture:** Use a Worker script for API routes and static asset delegation, keep model and validation logic in focused backend modules, and serve a standalone frontend from `public/`. Configure Workers AI via the `AI` binding and static files via the `ASSETS` binding so the Worker can remain small and explicit.

**Tech Stack:** JavaScript ESM, Cloudflare Workers, Workers AI binding, Wrangler static assets, Node test runner, HTML/CSS/vanilla JS

---

### Task 1: Bootstrap The Standard Worker Project

**Files:**
- Create: `package.json`
- Create: `wrangler.jsonc`
- Create: `src/worker.js`
- Create: `src/lib/http.js`
- Create: `src/lib/static.js`
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`
- Modify: `.gitignore`
- Test: `test/project-structure.spec.js`

- [ ] **Step 1: Write the failing project structure test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("project exposes required app entry files", () => {
  for (const file of [
    "package.json",
    "wrangler.jsonc",
    "src/worker.js",
    "public/index.html",
    "public/styles.css",
    "public/app.js",
  ]) {
    assert.equal(fs.existsSync(file), true, `${file} should exist`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/project-structure.spec.js`
Expected: FAIL because the new files do not exist yet.

- [ ] **Step 3: Add the minimum project scaffolding**

```json
{
  "name": "cf-worker-chat",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node --test"
  },
  "devDependencies": {
    "wrangler": "^4.13.2"
  }
}
```

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "cf-worker-chat",
  "main": "src/worker.js",
  "compatibility_date": "2026-03-23",
  "ai": {
    "binding": "AI"
  },
  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]
  }
}
```

- [ ] **Step 4: Re-run the structure test**

Run: `node --test test/project-structure.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the bootstrap**

```bash
git add .gitignore package.json wrangler.jsonc src/worker.js src/lib/http.js src/lib/static.js public/index.html public/styles.css public/app.js test/project-structure.spec.js
git commit -m "chore: bootstrap standard worker project"
```

### Task 2: Add Model Registry And Request Validation

**Files:**
- Create: `src/lib/models.js`
- Create: `src/lib/chat.js`
- Create: `test/models.spec.js`
- Create: `test/chat-validation.spec.js`

- [ ] **Step 1: Write the failing model registry test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODEL, getEnabledModels, isSupportedModel } from "../src/lib/models.js";

test("GLM-4.7-Flash is the default enabled model", () => {
  assert.equal(DEFAULT_MODEL, "@cf/zai-org/glm-4.7-flash");
  assert.equal(isSupportedModel(DEFAULT_MODEL), true);
  assert.ok(getEnabledModels().length >= 3);
});
```

- [ ] **Step 2: Write the failing validation test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChatRequest } from "../src/lib/chat.js";

test("normalizeChatRequest rejects unsupported models", () => {
  assert.throws(
    () => normalizeChatRequest({
      message: "hello",
      history: [],
      model: "@cf/not-real/model"
    }),
    /unsupported model/i
  );
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test test/models.spec.js test/chat-validation.spec.js`
Expected: FAIL because the modules do not exist yet.

- [ ] **Step 4: Implement the minimum model and validation modules**

```js
export const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";

const MODELS = [
  {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM-4.7-Flash",
    speedTag: "Fast",
    costTag: "Balanced",
    enabled: true,
  },
];
```

```js
export function normalizeChatRequest(body) {
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    throw new Error("Message is required");
  }

  if (!Array.isArray(body.history)) {
    throw new Error("History must be an array");
  }

  if (body.model && !isSupportedModel(body.model)) {
    throw new Error("Unsupported model");
  }

  return {
    message: body.message.trim(),
    history: body.history,
    model: body.model || DEFAULT_MODEL,
  };
}
```

- [ ] **Step 5: Re-run the tests**

Run: `node --test test/models.spec.js test/chat-validation.spec.js`
Expected: PASS

- [ ] **Step 6: Commit the backend configuration layer**

```bash
git add src/lib/models.js src/lib/chat.js test/models.spec.js test/chat-validation.spec.js
git commit -m "feat: add model registry and request validation"
```

### Task 3: Implement Worker Routes And Streaming Chat

**Files:**
- Modify: `src/worker.js`
- Modify: `src/lib/chat.js`
- Modify: `src/lib/http.js`
- Modify: `src/lib/static.js`
- Create: `test/config-endpoint.spec.js`
- Create: `test/chat-route.spec.js`
- Delete: `workers.js`

- [ ] **Step 1: Write the failing config endpoint test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

test("GET /api/config returns default model and enabled model list", async () => {
  const response = await worker.fetch(new Request("https://app.test/api/config"), {
    ASSETS: { fetch: () => { throw new Error("not used"); } },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.defaultModel, "@cf/zai-org/glm-4.7-flash");
  assert.ok(Array.isArray(body.models));
});
```

- [ ] **Step 2: Write the failing invalid chat request test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

test("POST /api/chat rejects invalid payloads", async () => {
  const response = await worker.fetch(new Request("https://app.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "", history: [] }),
  }), {
    AI: { run: async () => { throw new Error("should not run"); } },
    ASSETS: { fetch: () => { throw new Error("not used"); } },
  });

  assert.equal(response.status, 400);
});
```

- [ ] **Step 3: Run the route tests to verify they fail**

Run: `node --test test/config-endpoint.spec.js test/chat-route.spec.js`
Expected: FAIL because routes are not implemented yet.

- [ ] **Step 4: Implement the Worker routing and streaming path**

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config") {
      return json(buildClientConfig());
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const payload = normalizeChatRequest(await request.json());
      const stream = await env.AI.run(payload.model, {
        messages: buildMessages(payload),
        stream: true,
      });

      return new Response(stream, {
        headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
```

- [ ] **Step 5: Re-run the route tests**

Run: `node --test test/config-endpoint.spec.js test/chat-route.spec.js`
Expected: PASS

- [ ] **Step 6: Delete the obsolete prototype entry file**

Run: `rm workers.js`
Expected: the old single-file prototype is removed after the new Worker entry is active.

- [ ] **Step 7: Commit the Worker API implementation**

```bash
git add src/worker.js src/lib/chat.js src/lib/http.js src/lib/static.js test/config-endpoint.spec.js test/chat-route.spec.js workers.js
git commit -m "feat: add workers ai chat routes"
```

### Task 4: Build The Customer-Facing Chat UI

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`

- [ ] **Step 1: Add a small failing frontend state test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { formatModelLabel } from "../public/app.js";

test("formatModelLabel adds clear speed and cost hints", () => {
  assert.equal(
    formatModelLabel({ label: "GLM-4.7-Flash", speedTag: "Fast", costTag: "Balanced" }),
    "GLM-4.7-Flash · Fast · Balanced"
  );
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Implement the improved frontend**

```html
<header class="hero">
  <p class="eyebrow">Cloudflare Workers AI</p>
  <h1>多模型智能助手</h1>
  <p class="subtitle">默认适配 GLM-4.7-Flash，适合演示、客服和知识问答场景。</p>
</header>
```

```js
export function formatModelLabel(model) {
  return `${model.label} · ${model.speedTag} · ${model.costTag}`;
}
```

UI requirements:
- hydrate product copy and models from `/api/config`
- show starter prompt cards before the first user message
- render assistant Markdown progressively
- show clear sending and streaming state
- show current model on assistant replies
- support conversation reset
- keep mobile layout usable

- [ ] **Step 4: Re-run the frontend helper test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Perform manual UI verification**

Run: `npm run dev`
Expected: local Worker serves the redesigned UI, `/api/config` loads, static assets resolve, and the chat layout works on desktop and mobile-width viewport sizes.

- [ ] **Step 6: Commit the UI rebuild**

```bash
git add public/index.html public/styles.css public/app.js test/frontend-state.spec.js
git commit -m "feat: rebuild workers ai chat interface"
```

### Task 5: Rewrite Documentation And Final Verification

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Write the failing README coverage test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("README documents setup, models, and deployment", () => {
  const readme = fs.readFileSync("README.md", "utf8");
  for (const phrase of [
    "GLM-4.7-Flash",
    "Workers AI",
    "wrangler dev",
    "wrangler deploy",
    "/api/config",
  ]) {
    assert.match(readme, new RegExp(phrase));
  }
});
```

- [ ] **Step 2: Run the README test to verify it fails**

Run: `node --test test/readme.spec.js`
Expected: FAIL because the README is still a placeholder.

- [ ] **Step 3: Rewrite the docs and ignore rules**

README requirements:
- explain the app and its use cases
- document the standard Worker project structure
- document the `AI` binding and `ASSETS` usage
- list the default and optional models
- explain local development and deployment
- include troubleshooting for missing binding and model failures

`.gitignore` requirements:
- ignore `node_modules/`
- ignore `.wrangler/`
- ignore `.dev.vars`
- ignore coverage output and logs
- ignore `.DS_Store`

- [ ] **Step 4: Re-run the README test**

Run: `node --test test/readme.spec.js`
Expected: PASS

- [ ] **Step 5: Run full verification**

Run: `npm test`
Expected: PASS

Run: `npm run dev`
Expected: local app starts without config errors.

- [ ] **Step 6: Commit the documentation and verification pass**

```bash
git add README.md .gitignore package.json test/readme.spec.js
git commit -m "docs: add worker setup and usage guide"
```
