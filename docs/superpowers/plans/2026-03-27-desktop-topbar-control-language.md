# Desktop Top-Bar Control-Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop top bar feel fully unified by turning the model-catalog entry into the same kind of stable icon-plus-label control as the sidebar toggle.

**Architecture:** Keep the current model-picker behavior and top-bar structure, but add fixed-label icon-shell markup for `更多模型` and use CSS/ARIA state styling instead of changing visible button copy.

**Tech Stack:** Vanilla HTML/CSS/JS, Node test runner

---

## File Map

- `public/index.html`
  Add icon + label shell markup to the model-catalog toggle.

- `public/styles.css`
  Align the model-catalog toggle styling with the sidebar-toggle control language.

- `public/app.js`
  Preserve existing catalog behavior while updating only the label node.

- `test/frontend-state.spec.js`
  Add a fixed-label helper contract for the model-catalog toggle.

- `test/layout-contract.spec.js`
  Add markup/style coverage for the unified desktop control language.

## Task 1: Add Failing Regression Tests

**Files:**
- Modify: `test/frontend-state.spec.js`
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write failing fixed-label and icon-shell assertions**
- [ ] **Step 2: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js` and confirm they fail**

## Task 2: Implement Minimal Markup And Style Refinements

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`

- [ ] **Step 1: Add icon + label markup to `更多模型`**
- [ ] **Step 2: Keep a fixed visible label and state-driven styling**
- [ ] **Step 3: Re-run the targeted tests and confirm they pass**

## Task 3: Full Verification

**Files:**
- No additional file edits expected

- [ ] **Step 1: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js`**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Commit only this iteration’s files**
