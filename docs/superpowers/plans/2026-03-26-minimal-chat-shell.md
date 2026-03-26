# Minimal Chat Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-panel shell with a single-column chat UI, move model switching into the top bar, and add local multi-session persistence with manual clear-all support.

**Architecture:** Keep the existing Worker API and browser chat flow, but simplify the page shell and move browser state toward explicit session persistence. Introduce a small browser-side persistence layer for local sessions, keep streaming rendering untouched, and reuse the existing code-block enhancement path only for completed assistant replies.

**Tech Stack:** JavaScript ESM, vanilla HTML/CSS/JS, Cloudflare Worker config endpoint, localStorage, Node test runner

---

## File Map

- `public/index.html`
  Remove presentation-style sections and rebuild the shell around a compact top bar plus one chat column.

- `public/styles.css`
  Replace right-rail and summary styling with compact top-bar controls and a quieter single-column layout.

- `public/app.js`
  Integrate top-bar controls, route all chat/history operations through an active session model, and hook persistence into existing render paths.

- `public/lib/local-sessions.js`
  New pure helper module for:
  - storage key management
  - safe localStorage parse / write
  - session normalization
  - session creation, selection, trimming, and clear-all behavior

- `test/frontend-state.spec.js`
  Add persistence and shell-state behavior coverage.

- `test/layout-contract.spec.js`
  Replace old shell assertions with the new top-bar and single-column contract.

- `README.md`
  Update only if the visible usage flow materially changes after implementation.

## Task 1: Define A Pure Local Session Persistence Helper

**Files:**
- Create: `public/lib/local-sessions.js`
- Modify: `test/frontend-state.spec.js`

- [ ] **Step 1: Write the failing persistence tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptySession,
  buildInitialSessionStore,
  persistSessionStore,
  restoreSessionStore,
  clearAllSessions,
} from "../public/lib/local-sessions.js";

test("buildInitialSessionStore restores multiple sessions and active session id safely", () => {
  const store = buildInitialSessionStore({
    defaultModelId: "@cf/zai-org/glm-4.7-flash",
    storageValue: JSON.stringify({
      activeSessionId: "s2",
      sessions: [
        { id: "s1", history: [], modelId: "@cf/zai-org/glm-4.7-flash" },
        { id: "s2", history: [{ role: "user", content: "hi" }], modelId: "@cf/openai/gpt-oss-20b" },
      ],
    }),
  });

  assert.equal(store.activeSessionId, "s2");
  assert.equal(store.sessions.length, 2);
  assert.equal(store.sessions[1].modelId, "@cf/openai/gpt-oss-20b");
});

test("clearAllSessions returns a fresh empty session", () => {
  const store = clearAllSessions({
    defaultModelId: "@cf/zai-org/glm-4.7-flash",
  });

  assert.equal(store.sessions.length, 1);
  assert.equal(store.sessions[0].history.length, 0);
});
```

- [ ] **Step 2: Run the persistence test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because `public/lib/local-sessions.js` does not exist yet.

- [ ] **Step 3: Implement the minimum persistence helper**

Create `public/lib/local-sessions.js` with focused helpers:

```js
export function createEmptySession(defaultModelId) {
  const now = Date.now();
  return {
    id: `session-${now}`,
    title: "新对话",
    createdAt: now,
    updatedAt: now,
    history: [],
    modelId: defaultModelId,
    expandedCodeBlocks: {},
  };
}
```

Also add helpers for:
- safe JSON parse
- normalizing restored sessions
- trimming to maximum session/message limits
- storing and restoring the active session id
- clearing everything back to one empty session

- [ ] **Step 4: Re-run the persistence test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the persistence helper**

```bash
git add public/lib/local-sessions.js test/frontend-state.spec.js
git commit -m "feat: add local session persistence helpers"
```

## Task 2: Replace The Existing Page Shell With A Minimal Top-Bar Layout

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write the failing shell contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index.html exposes only the top-bar chat shell controls", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  assert.match(html, /id="topBar"/);
  assert.match(html, /id="modelPicker"/);
  assert.match(html, /id="sessionMenuToggle"/);
  assert.match(html, /id="newChatButton"/);

  assert.doesNotMatch(html, /id="sessionSummary"/);
  assert.doesNotMatch(html, /id="starterPrompts"/);
  assert.doesNotMatch(html, /id="workspaceBadges"/);
});
```

- [ ] **Step 2: Run the shell contract test to verify it fails**

Run: `node --test test/layout-contract.spec.js`
Expected: FAIL because the current HTML still contains the old shell.

- [ ] **Step 3: Implement the minimal shell**

Update `public/index.html` so the page contains:
- a compact `#topBar`
- a model selector container in the top bar
- session-history and new-chat controls in the top bar
- one main chat column
- the existing composer

Remove:
- title and subtitle
- badges
- session summary
- quick-start section
- side-column layout

Update `public/styles.css` so:
- the top bar behaves like a compact control strip
- the page uses one main chat column
- spacing is tighter and calmer
- mobile layout keeps all controls reachable without restoring extra chrome

- [ ] **Step 4: Re-run the shell contract test**

Run: `node --test test/layout-contract.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the shell rewrite**

```bash
git add public/index.html public/styles.css test/layout-contract.spec.js
git commit -m "feat: simplify chat shell layout"
```

## Task 3: Move Model Selection Into The Top Bar

**Files:**
- Modify: `public/app.js`
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `test/frontend-state.spec.js`

- [ ] **Step 1: Write the failing model-shell tests**

```js
test("rendered model controls keep model switching available without the side rail", () => {
  assert.equal(typeof app.formatModelLabel, "function");
  // Add a narrow pure helper if needed so this remains testable without DOM-heavy setup.
});
```

- [ ] **Step 2: Run the frontend-state test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because the new top-bar control path is not implemented yet.

- [ ] **Step 3: Implement the minimum top-bar model path**

Refactor `public/app.js` to:
- point element lookups to the new top-bar controls
- keep the featured model picker compact
- optionally open the full searchable catalog from the same compact area
- remove dependency on the deleted side panel
- preserve existing model locking during generation

- [ ] **Step 4: Re-run the frontend-state test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the top-bar model controls**

```bash
git add public/app.js public/index.html public/styles.css test/frontend-state.spec.js
git commit -m "feat: move model controls into top bar"
```

## Task 4: Route The Chat UI Through Active Local Sessions

**Files:**
- Modify: `public/app.js`
- Modify: `public/lib/local-sessions.js`
- Modify: `test/frontend-state.spec.js`

- [ ] **Step 1: Write the failing active-session tests**

```js
test("session switching restores history and selected model", () => {
  // Add a pure helper around active-session selection if needed.
});

test("new chat creates a fresh local session without deleting old ones", () => {
  // Assert the next store has one more session and an empty active history.
});
```

- [ ] **Step 2: Run the frontend-state test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because active-session routing does not exist yet.

- [ ] **Step 3: Implement the minimum session routing**

Refactor `public/app.js` so:
- `state.history` becomes derived from the active session rather than a global array
- `state.selectedModel` follows the active session’s model
- sending a message writes into the active session
- code-block expansion state remains per session
- switching sessions updates the visible chat immediately

- [ ] **Step 4: Re-run the frontend-state test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the session routing changes**

```bash
git add public/app.js public/lib/local-sessions.js test/frontend-state.spec.js
git commit -m "feat: persist active local chat sessions"
```

## Task 5: Add History UI And Clear-All Support

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`
- Modify: `test/layout-contract.spec.js`
- Modify: `test/frontend-state.spec.js`

- [ ] **Step 1: Write the failing history-menu tests**

```js
test("layout exposes history and new-chat controls in the top bar", () => {
  // Assert the new ids/classes exist in the HTML contract.
});

test("clear-all rebuilds a fresh empty session store", () => {
  // Assert the pure helper or app-level state transition recreates one empty session.
});
```

- [ ] **Step 2: Run the relevant tests to verify they fail**

Run: `node --test test/layout-contract.spec.js test/frontend-state.spec.js`
Expected: FAIL because the history menu and clear-all flow do not yet exist.

- [ ] **Step 3: Implement the minimum history menu**

Add a compact top-bar history panel that:
- lists local sessions
- marks the active one
- allows switching
- includes a “clear all conversations” action
- confirms before destructive clearing

Do not add side drawers or heavy panels unless required by the final layout.

- [ ] **Step 4: Re-run the relevant tests**

Run: `node --test test/layout-contract.spec.js test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the history controls**

```bash
git add public/index.html public/styles.css public/app.js test/layout-contract.spec.js test/frontend-state.spec.js
git commit -m "feat: add local session history controls"
```

## Task 6: Persist On Load, Mutate, And Reset Paths

**Files:**
- Modify: `public/app.js`
- Modify: `public/lib/local-sessions.js`
- Modify: `test/frontend-state.spec.js`

- [ ] **Step 1: Write the failing persistence lifecycle tests**

```js
test("boot restores saved sessions before the first render", () => {
  // Assert a pure init helper restores saved store data.
});

test("message sends and resets persist the updated active session store", () => {
  // Assert store persistence is called on meaningful mutations.
});
```

- [ ] **Step 2: Run the frontend-state test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because boot-time and mutation persistence are incomplete.

- [ ] **Step 3: Implement the minimum lifecycle persistence**

Ensure `public/app.js`:
- restores local sessions after config load
- persists after session creation, switching, sending, reset, model change, and clear-all
- degrades safely if localStorage is unavailable

- [ ] **Step 4: Re-run the frontend-state test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the lifecycle persistence**

```bash
git add public/app.js public/lib/local-sessions.js test/frontend-state.spec.js
git commit -m "fix: persist local session lifecycle"
```

## Task 7: Run Full Verification And Update Docs If Needed

**Files:**
- Modify: `README.md` (only if the visible usage flow materially changed)

- [ ] **Step 1: Run the focused verification suite**

Run:

```bash
node --test test/layout-contract.spec.js test/frontend-state.spec.js
node --check public/app.js
```

Expected:
- PASS
- no syntax errors

- [ ] **Step 2: Run the full project test suite**

Run:

```bash
npm test
```

Expected:
- all tests pass

- [ ] **Step 3: Update README if needed**

If the user-facing flow changed materially, update the README sections covering:
- local development UX
- model switching UX
- local session persistence behavior

- [ ] **Step 4: Re-run full verification if docs or code changed**

Run:

```bash
npm test
```

Expected:
- PASS

- [ ] **Step 5: Commit the final verified state**

```bash
git add public/index.html public/styles.css public/app.js public/lib/local-sessions.js test/layout-contract.spec.js test/frontend-state.spec.js README.md
git commit -m "feat: simplify chat shell and persist local sessions"
```
