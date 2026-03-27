# Compact Mobile Top-Bar Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the small-screen top bar feel tighter and more app-like while keeping the visible `对话记录` label and the existing model-switching workflow.

**Architecture:** Keep the current top-bar DOM structure and sidebar/model behavior, but add narrow-screen CSS overrides that stop the top controls from feeling full-width and stacked. Constrain the work to spacing, sizing, and compact control rhythm.

**Tech Stack:** Vanilla HTML/CSS/JS, Node test runner

---

## File Map

- `public/styles.css`
  Add small-screen overrides for the top-bar control row, sidebar toggle, and model picker rhythm.

- `test/layout-contract.spec.js`
  Add compact-mobile top-bar assertions so the narrow-screen rhythm stays stable.

## Task 1: Add Failing Compact-Mobile Contract Tests

**Files:**
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write the failing narrow-screen top-bar assertions**
- [ ] **Step 2: Run `node --test test/layout-contract.spec.js` and confirm they fail**

## Task 2: Implement Minimal CSS Overrides

**Files:**
- Modify: `public/styles.css`

- [ ] **Step 1: Remove top-bar-specific full-width behavior on smaller screens**
- [ ] **Step 2: Keep the model picker in a compact row on narrow screens**
- [ ] **Step 3: Tighten spacing, padding, and icon-label rhythm without hiding the label**
- [ ] **Step 4: Re-run `node --test test/layout-contract.spec.js` and confirm it passes**

## Task 3: Full Verification

**Files:**
- No additional file edits expected

- [ ] **Step 1: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js`**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Commit only this iteration’s files**
