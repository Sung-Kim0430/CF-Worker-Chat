# Top-Bar Sidebar Toggle Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the top-bar sidebar toggle feel like a stable navigation capsule with a fixed label and quiet icon, while preserving existing sidebar behavior.

**Architecture:** Keep the current sidebar open/close logic and top-bar structure, but split the toggle into icon + label markup and move state communication into CSS and ARIA rather than visible copy changes.

**Tech Stack:** Vanilla HTML/CSS/JS, Node test runner

---

## File Map

- `public/index.html`
  Add fixed icon + label markup inside the sidebar toggle button.

- `public/styles.css`
  Refresh the toggle into a low-noise capsule control with icon-aware spacing and state styling.

- `public/app.js`
  Preserve existing toggle behavior while updating only the label node instead of replacing button content.

- `test/frontend-state.spec.js`
  Add helper coverage for the fixed visible label contract.

- `test/layout-contract.spec.js`
  Assert the top-bar toggle exposes the icon + label shell.

## Task 1: Add The Fixed-Label Toggle Tests

**Files:**
- Modify: `test/frontend-state.spec.js`
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js` and confirm they fail**
- [ ] **Step 3: Update the implementation**
- [ ] **Step 4: Re-run the targeted tests and confirm they pass**

## Task 2: Refresh The Toggle Markup And Styling

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`

- [ ] **Step 1: Add icon + label markup to the toggle button**
- [ ] **Step 2: Style the toggle as a calm navigation capsule**
- [ ] **Step 3: Keep state-driven styling through `aria-expanded`**
- [ ] **Step 4: Update JS to avoid wiping the icon markup during rerender**

## Task 3: Full Verification

**Files:**
- No additional file edits expected

- [ ] **Step 1: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js`**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Review diff and commit only this iteration’s files**
