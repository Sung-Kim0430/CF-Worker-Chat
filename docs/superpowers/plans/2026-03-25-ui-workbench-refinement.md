# UI Workbench Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the current chat app into a balanced AI workspace while fixing streaming, history, and interaction-state bugs that currently weaken the experience.

**Architecture:** Keep the existing Cloudflare Worker structure and refine the browser layer in place. Move the fragile chat-flow logic into small browser-side helper modules, enrich `/api/config` with UI-friendly metadata, and rebuild the page into a stronger workspace layout with targeted render paths instead of whole-page re-renders.

**Tech Stack:** JavaScript ESM, Cloudflare Workers, Workers AI binding, vanilla HTML/CSS/JS, Node test runner, project-local `ui-ux-pro-max` guidance, optional Playwright smoke verification

---

## File Map

- `src/lib/models.js`
  Expand runtime UI configuration so the browser can render richer status, quick actions, and scenario-driven prompt cards without hardcoded duplication.

- `src/worker.js`
  Keep API shape stable while returning the richer config payload. Only change behavior if needed to support the refined UI state.

- `public/index.html`
  Restructure the layout into a balanced workspace header, active session area, operator side rail, and stronger composer surface.

- `public/styles.css`
  Apply the new visual hierarchy, component states, and mobile layout rules.

- `public/app.js`
  Become the main coordinator only. It should not contain all pure chat-flow logic directly.

- `public/lib/chat-flow.js`
  New pure browser helper module for:
  - SSE block extraction
  - tail-buffer finalization
  - outbound history filtering
  - partial-failure annotation

- `public/lib/ui-state.js`
  New pure browser helper module for:
  - session status labels
  - control lock state
  - model/session badge formatting

- `test/chat-flow.spec.js`
  Regression coverage for SSE parsing and request-history filtering.

- `test/frontend-state.spec.js`
  Expanded coverage for locked controls and UI state formatting.

- `test/config-endpoint.spec.js`
  Validate enriched config payload shape.

- `README.md`
  Update feature and UI description only if the finished implementation materially changes the documented experience.

### Task 1: Enrich Runtime Config For The New Workspace

**Files:**
- Modify: `src/lib/models.js`
- Modify: `src/worker.js`
- Modify: `test/config-endpoint.spec.js`

- [ ] **Step 1: Write the failing config test for richer UI metadata**

```js
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

test("GET /api/config returns structured prompt cards and workspace badges", async () => {
  const response = await worker.fetch(new Request("https://app.test/api/config"), {
    ASSETS: { fetch: () => { throw new Error("not used"); } },
  });

  const body = await response.json();

  assert.ok(Array.isArray(body.workspaceBadges));
  assert.equal(typeof body.workspaceBadges[0].label, "string");
  assert.equal(typeof body.starterPrompts[0].title, "string");
  assert.equal(typeof body.starterPrompts[0].prompt, "string");
});
```

- [ ] **Step 2: Run the config test to verify it fails**

Run: `node --test test/config-endpoint.spec.js`
Expected: FAIL because `/api/config` does not yet expose the richer metadata.

- [ ] **Step 3: Implement the minimum config expansion**

Add structured configuration in `src/lib/models.js` similar to:

```js
export const APP_CONFIG = {
  title: "Workers AI 多模型助手",
  subtitle: "...",
  workspaceBadges: [
    { label: "Streaming", tone: "success" },
    { label: "GLM Ready", tone: "info" },
  ],
  starterPrompts: [
    {
      title: "售前演示",
      description: "生成一段适合客户沟通的产品介绍",
      prompt: "帮我写一段适合售前演示的产品介绍文案。",
    },
  ],
};
```

Keep `buildClientConfig()` as the single source of truth for browser runtime copy.

- [ ] **Step 4: Re-run the config test**

Run: `node --test test/config-endpoint.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the config layer**

```bash
git add src/lib/models.js src/worker.js test/config-endpoint.spec.js
git commit -m "feat: enrich workspace runtime config"
```

### Task 2: Add Regression Helpers For Streaming And History Safety

**Files:**
- Create: `public/lib/chat-flow.js`
- Create: `test/chat-flow.spec.js`

- [ ] **Step 1: Write the failing chat-flow regression tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  consumeCompleteSseBlocks,
  consumeFinalSseBlock,
  buildRequestHistory,
  applyAssistantFailure,
} from "../public/lib/chat-flow.js";

test("consumeFinalSseBlock preserves trailing SSE data without a blank terminator", () => {
  const events = [];
  const done = consumeFinalSseBlock('data: {"response":"tail"}', (value) => {
    events.push(value);
  });

  assert.equal(done, false);
  assert.deepEqual(events, ["tail"]);
});

test("buildRequestHistory excludes transient assistant failures", () => {
  const history = buildRequestHistory([
    { role: "user", content: "hello" },
    { role: "assistant", content: "partial", includeInHistory: true },
    { role: "assistant", content: "请求失败", includeInHistory: false },
  ]);

  assert.deepEqual(history, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "partial" },
  ]);
});
```

- [ ] **Step 2: Run the regression test to verify it fails**

Run: `node --test test/chat-flow.spec.js`
Expected: FAIL because `public/lib/chat-flow.js` does not exist yet.

- [ ] **Step 3: Implement the minimum pure helper module**

Create helpers with behavior like:

```js
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
```

Also implement SSE helpers that:
- consume fully delimited blocks from a buffer
- process any final partial block at stream end
- reuse one payload-to-text extraction path

- [ ] **Step 4: Re-run the regression test**

Run: `node --test test/chat-flow.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the helper module**

```bash
git add public/lib/chat-flow.js test/chat-flow.spec.js
git commit -m "fix: add chat flow regressions and helpers"
```

### Task 3: Rebuild Browser State Handling Around Session Semantics

**Files:**
- Create: `public/lib/ui-state.js`
- Modify: `public/app.js`
- Modify: `test/frontend-state.spec.js`

- [ ] **Step 1: Write the failing UI-state tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  getControlState,
  getSessionStatus,
} from "../public/lib/ui-state.js";

test("getControlState locks model and reset controls during generation", () => {
  assert.deepEqual(getControlState({ isSending: true, hasHistory: true }), {
    sendDisabled: true,
    inputDisabled: true,
    modelDisabled: true,
    resetDisabled: true,
  });
});

test("getSessionStatus labels interrupted partial generations as warnings", () => {
  assert.deepEqual(
    getSessionStatus({ phase: "interrupted", hasPartialContent: true }),
    { tone: "warning", message: "生成已中断，已保留部分内容。" },
  );
});
```

- [ ] **Step 2: Run the UI-state test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because `public/lib/ui-state.js` does not exist yet.

- [ ] **Step 3: Implement the minimum UI-state helpers**

Create pure state helpers such as:

```js
export function getControlState({ isSending, hasHistory, hasInput }) {
  return {
    sendDisabled: isSending || !hasInput,
    inputDisabled: isSending,
    modelDisabled: isSending,
    resetDisabled: isSending || !hasHistory,
  };
}
```

```js
export function getSessionStatus({ phase, hasPartialContent }) {
  if (phase === "interrupted" && hasPartialContent) {
    return { tone: "warning", message: "生成已中断，已保留部分内容。" };
  }
}
```

- [ ] **Step 4: Refactor `public/app.js` to use targeted render functions**

Refactor around focused functions:
- `renderShell()`
- `renderOperatorPanel()`
- `renderMessages()`
- `renderComposer()`
- `updateSessionStatus()`

Behavior requirements:
- do not rebuild the full right rail on every stream chunk
- use `buildRequestHistory()` when preparing `/api/chat`
- preserve partial assistant output if a stream fails
- only send persistent assistant content back to the model
- disable model selection while generating
- display the request-start model clearly for each assistant turn

- [ ] **Step 5: Re-run the UI-state test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 6: Commit the browser state refactor**

```bash
git add public/lib/ui-state.js public/app.js test/frontend-state.spec.js
git commit -m "feat: refine session state handling"
```

### Task 4: Rebuild The Layout Into A Balanced Workspace

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`

- [ ] **Step 1: Write the failing DOM contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index.html exposes the balanced workspace anchors", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  for (const id of [
    "workspaceHeader",
    "sessionSummary",
    "sessionMeta",
    "composerActions",
    "starterPrompts",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
```

- [ ] **Step 2: Run the DOM contract test to verify it fails**

Run: `node --test test/layout-contract.spec.js`
Expected: FAIL because the new workspace anchors do not exist yet.

- [ ] **Step 3: Implement the balanced workspace layout**

Update `public/index.html` and `public/styles.css` to introduce:
- a compact product header with runtime badges
- a stronger session-summary area above the message list
- a denser operator side rail
- a more capable composer with quick actions
- clearer warning/error styling
- mobile-specific priority ordering for conversation first, controls second

Representative HTML anchor pattern:

```html
<section id="workspaceHeader" class="hero-card panel"></section>
<section id="sessionSummary" class="session-summary"></section>
<div id="sessionMeta" class="session-meta"></div>
<div id="composerActions" class="composer-actions"></div>
```

- [ ] **Step 4: Re-run the DOM contract test**

Run: `node --test test/layout-contract.spec.js`
Expected: PASS

- [ ] **Step 5: Run a browser-facing smoke check**

Run: `npm test`
Expected: PASS

Run: `npm run dev`
Expected: local Worker starts and serves the updated layout. If Wrangler requires Cloudflare authentication in the current environment, authenticate first, then re-run.

Optional visual verification using @playwright:
- open the local page
- confirm the new header, session summary, operator rail, and composer states render correctly
- verify the model selector is disabled during a mocked send flow

- [ ] **Step 6: Commit the workspace UI rebuild**

```bash
git add public/index.html public/styles.css public/app.js test/layout-contract.spec.js
git commit -m "feat: rebuild chat ui as balanced workspace"
```

### Task 5: Final Documentation Touch-Up And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `test/readme.spec.js`

- [ ] **Step 1: Write the failing README expectation for the refined workspace**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("README mentions the balanced workspace experience", () => {
  const readme = fs.readFileSync("README.md", "utf8");
  assert.match(readme, /balanced workspace/i);
});
```

- [ ] **Step 2: Run the README test to verify it fails**

Run: `node --test test/readme.spec.js`
Expected: FAIL if the README does not yet describe the new UI and workflow behavior.

- [ ] **Step 3: Update README only where the implementation changed the product story**

Document:
- the balanced workspace layout
- improved model/status clarity
- the refined behavior around streaming and interrupted responses

- [ ] **Step 4: Re-run the README test**

Run: `node --test test/readme.spec.js`
Expected: PASS

- [ ] **Step 5: Run full verification**

Run: `npm test`
Expected: PASS

Run: `git status --short`
Expected: only intended tracked file changes remain.

- [ ] **Step 6: Commit the final polish**

```bash
git add README.md test/readme.spec.js
git commit -m "docs: update workspace experience guide"
```
