# Code Block Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clean fenced-code-block enhancements for completed assistant messages: syntax highlighting, auto language fallback, line numbers, and copy actions.

**Architecture:** Keep streaming messages in plain-text mode. Enhance only completed Markdown fenced code blocks by post-processing rendered HTML, so code block UI is stable and does not reintroduce reply-time flicker. Use a lightweight highlighter integration and event delegation for copy behavior.

**Tech Stack:** Vanilla JS, marked, DOMPurify, highlight.js (browser CDN), Node test runner.

---

### Task 1: Lock code block enhancement behavior with tests

**Files:**
- Modify: `test/frontend-state.spec.js`
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write failing tests for code block enhancement helpers**
- [ ] **Step 2: Run targeted tests to verify they fail**
- [ ] **Step 3: Add minimal helper exports and keep failures focused on missing behavior**
- [ ] **Step 4: Re-run targeted tests and confirm the intended failures**
- [ ] **Step 5: Commit**

### Task 2: Implement fenced code block enhancement pipeline

**Files:**
- Modify: `public/app.js`
- Modify: `public/index.html`
- Modify: `public/styles.css`

- [ ] **Step 1: Add render helpers for language extraction, auto-detect fallback, and code block HTML generation**
- [ ] **Step 2: Ensure completed assistant Markdown passes through code block enhancement while streaming remains plain text**
- [ ] **Step 3: Add copy-button event delegation and temporary success state**
- [ ] **Step 4: Add clean styles for toolbar, language label, line numbers, and scroll behavior**
- [ ] **Step 5: Re-run targeted tests and fix regressions**
- [ ] **Step 6: Commit**

### Task 3: Verify docs and complete integration

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the new fenced-code-block UX briefly in README**
- [ ] **Step 2: Run full suite (`npm test`)**
- [ ] **Step 3: Verify the project status is clean and ready for integration**
- [ ] **Step 4: Merge to `main` and push to `origin` per user request**
