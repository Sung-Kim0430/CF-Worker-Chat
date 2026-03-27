# Claude-Style Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the conversation-history sidebar feel calmer and more Claude-like through a more relaxed row layout, compact time labels, and more natural active states.

**Architecture:** Add a small display-model helper for sidebar rows in `public/app.js`, add a compact sidebar timestamp formatter in `public/lib/local-sessions.js`, and simplify the row structure to title + one secondary line. Use focused CSS changes to make the row rhythm quieter without changing sidebar behavior.

**Tech Stack:** Vanilla HTML/CSS/JS, Node test runner

---

## File Map

- `public/lib/local-sessions.js`
  Add a compact sidebar timestamp formatter.

- `public/app.js`
  Add a session-row display-model helper and update row rendering to use title + one secondary line.

- `public/styles.css`
  Refine sidebar group spacing, row rhythm, timestamp tone, and active/hover styles.

- `test/local-sessions.spec.js`
  Add coverage for the compact sidebar timestamp formatter.

- `test/frontend-state.spec.js`
  Add coverage for the session-row display-model helper.

- `test/layout-contract.spec.js`
  Update sidebar layout contracts to reflect the calmer Claude-style row treatment.

## Task 1: Add Failing Regression Tests

**Files:**
- Modify: `test/local-sessions.spec.js`
- Modify: `test/frontend-state.spec.js`
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write failing tests for compact sidebar timestamps**
- [ ] **Step 2: Write failing tests for smarter session-row secondary text selection**
- [ ] **Step 3: Write failing style-contract assertions for the calmer sidebar row rhythm**
- [ ] **Step 4: Run `node --test test/local-sessions.spec.js test/frontend-state.spec.js test/layout-contract.spec.js` and confirm the new assertions fail**

## Task 2: Implement Minimal Sidebar Refinements

**Files:**
- Modify: `public/lib/local-sessions.js`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Add the compact sidebar timestamp helper**
- [ ] **Step 2: Add the session-row display-model helper and simplify row markup**
- [ ] **Step 3: Refine sidebar spacing, truncation behavior, and active-state styling**
- [ ] **Step 4: Re-run the targeted tests and confirm they pass**

## Task 3: Full Verification And Commit

**Files:**
- No additional file edits expected

- [ ] **Step 1: Run `node --test test/local-sessions.spec.js test/frontend-state.spec.js test/layout-contract.spec.js`**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Commit only this iteration’s files**
