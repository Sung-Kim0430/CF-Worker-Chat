# Minimal Chat Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the new minimal shell so desktop uses a left history sidebar, mobile collapses that sidebar cleanly, and the session list becomes easier to scan through smarter titles, gentler active-state emphasis, and more useful time labels.

**Architecture:** Keep the existing Worker API and current local-session persistence, but rebalance the UI so model controls stay in the top bar while conversation history moves into a dedicated left sidebar. Add pure helpers for fixed-title cleanup, relative time labels, and ordering rules so the sidebar UX stays testable and stable.

**Tech Stack:** JavaScript ESM, vanilla HTML/CSS/JS, Cloudflare Worker config endpoint, localStorage, Node test runner

---

## File Map

- `public/index.html`
  Rework the shell around a compact top bar, a desktop-left session sidebar, and the main chat column.

- `public/styles.css`
  Style the session sidebar, mobile collapse behavior, and calmer active-session emphasis.

- `public/app.js`
  Integrate the sidebar controls, render smarter session metadata, and keep ordering stable for content updates only.

- `public/lib/local-sessions.js`
  Expand the local-session helper module with:
  - smarter fixed-title generation
  - relative time label formatting
  - ordering helpers that avoid noisy reordering from UI-only changes

- `test/frontend-state.spec.js`
  Add persistence and shell-state behavior coverage.

- `test/layout-contract.spec.js`
  Replace old shell assertions with the new top-bar and single-column contract.

- `README.md`
  Update only if the visible usage flow materially changes after implementation.

## Task 1: Add Pure Session-List Presentation Helpers

**Files:**
- Modify: `public/lib/local-sessions.js`
- Modify: `test/local-sessions.spec.js`

- [ ] **Step 1: Write the failing session-list helper tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSessionTitle,
  formatSessionUpdatedLabel,
  sortSessionsByUpdatedAt,
} from "../public/lib/local-sessions.js";

test("buildSessionTitle derives a fixed clean title from the first user message", () => {
  const title = buildSessionTitle([
    { role: "user", content: '##  请帮我把这个 Cloudflare Worker 聊天站点重构一下，并清理 UI 文案  ' },
    { role: "user", content: "后续追问不应该改变标题" },
  ]);

  assert.equal(title, "请帮我把这个 Cloudflare Wor…");
});

test("formatSessionUpdatedLabel prefers relative labels for recent sessions", () => {
  const now = new Date(2026, 2, 26, 15, 0).getTime();

  assert.equal(formatSessionUpdatedLabel(now - 30_000, now), "刚刚");
  assert.equal(formatSessionUpdatedLabel(now - 10 * 60_000, now), "10 分钟前");
});
```

- [ ] **Step 2: Run the session-list helper test to verify it fails**

Run: `node --test test/local-sessions.spec.js`
Expected: FAIL because the current title and time helpers are still too coarse.

- [ ] **Step 3: Implement the minimum session-list helpers**

Extend `public/lib/local-sessions.js` with:
- smarter title cleanup / truncation
- relative time formatting
- ordering helpers that remain stable for identical timestamps
- optional metadata helpers if they keep `public/app.js` smaller

- [ ] **Step 4: Re-run the helper test**

Run: `node --test test/local-sessions.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the helper refinement**

```bash
git add public/lib/local-sessions.js test/local-sessions.spec.js
git commit -m "feat: refine local session list helpers"
```

## Task 2: Replace The History Popover With A Left Sidebar

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
  assert.match(html, /id="sessionSidebar"/);
  assert.match(html, /id="sessionSidebarToggle"/);
  assert.match(html, /id="newChatButton"/);
  assert.match(html, /id="sessionList"/);

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
- a compact `#topBar` with model controls
- a desktop-left `#sessionSidebar`
- a mobile history toggle
- the existing chat column and composer

Update `public/styles.css` so:
- the sidebar is always visible on desktop
- the sidebar collapses cleanly on mobile
- the active session row is clearer but still restrained

- [ ] **Step 4: Re-run the shell contract test**

Run: `node --test test/layout-contract.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the shell rewrite**

```bash
git add public/index.html public/styles.css test/layout-contract.spec.js
git commit -m "feat: simplify chat shell layout"
```

## Task 3: Refine Sidebar Row Content And Active-State Styling

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `test/local-sessions.spec.js`
- Modify: `test/preview-server.spec.js`

- [ ] **Step 1: Write the failing sidebar UX tests**

```js
test("preview server exposes the sidebar history controls", async () => {
  // Assert the preview HTML includes the sidebar and the mobile toggle.
});
```

- [ ] **Step 2: Run the frontend-state test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because the history UI still uses the old popover or old styling contract.

- [ ] **Step 3: Implement the minimum sidebar row refinement**

Refactor `public/app.js` to:
- render smarter titles and relative time labels
- render compact second-line metadata
- use gentler active-state emphasis
- keep model controls in the top bar

- [ ] **Step 4: Re-run the frontend-state test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the sidebar row refinement**

```bash
git add public/app.js public/index.html public/styles.css test/frontend-state.spec.js
git commit -m "feat: refine sidebar history presentation"
```

## Task 4: Keep Ordering Stable For Meaningful Updates Only

**Files:**
- Modify: `public/app.js`
- Modify: `public/lib/local-sessions.js`
- Modify: `test/local-sessions.spec.js`

- [ ] **Step 1: Write the failing active-session tests**

```js
test("UI-only session state changes do not bump sidebar ordering", () => {
  // Add a pure helper if needed to distinguish content updates from UI-only updates.
});
```

- [ ] **Step 2: Run the frontend-state test to verify it fails**

Run: `node --test test/frontend-state.spec.js`
Expected: FAIL because the app still treats some UI-only updates as meaningful session activity.

- [ ] **Step 3: Implement the minimum ordering refinement**

Refactor `public/app.js` so:
- message/content updates refresh `updatedAt`
- pure UI-only updates such as code-block expansion do not refresh `updatedAt`
- switching and restoring sessions keep ordering predictable

- [ ] **Step 4: Re-run the frontend-state test**

Run: `node --test test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the ordering changes**

```bash
git add public/app.js public/lib/local-sessions.js test/frontend-state.spec.js
git commit -m "fix: stabilize sidebar session ordering"
```

## Task 5: Polish Mobile Sidebar Collapse Behavior

**Files:**
- Modify: `public/styles.css`
- Modify: `public/app.js`
- Modify: `test/layout-contract.spec.js`
- Modify: `test/preview-server.spec.js`

- [ ] **Step 1: Write the failing history-menu tests**

```js
test("layout exposes a mobile sidebar toggle and desktop sidebar shell", () => {
  // Assert the new sidebar ids/classes exist in the HTML contract.
});
```

- [ ] **Step 2: Run the relevant tests to verify they fail**

Run: `node --test test/layout-contract.spec.js test/frontend-state.spec.js`
Expected: FAIL because the current shell still uses the old history interaction model.

- [ ] **Step 3: Implement the minimum mobile collapse behavior**

Add:
- a mobile-only history toggle in the top bar
- a collapsible sidebar on small screens
- close-on-select behavior for mobile
- a light backdrop only if needed to keep the interaction clear

- [ ] **Step 4: Re-run the relevant tests**

Run: `node --test test/layout-contract.spec.js test/frontend-state.spec.js`
Expected: PASS

- [ ] **Step 5: Commit the sidebar collapse behavior**

```bash
git add public/index.html public/styles.css public/app.js test/layout-contract.spec.js test/frontend-state.spec.js
git commit -m "feat: add responsive sidebar history controls"
```

## Task 6: Re-run Full Verification And Update Docs If Needed

**Files:**
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
