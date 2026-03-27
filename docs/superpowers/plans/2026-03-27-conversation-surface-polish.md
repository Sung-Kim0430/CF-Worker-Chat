# Conversation Surface Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first screen, composer, and message area feel calmer and more product-like while preserving streaming stability and the current chat workflow.

**Architecture:** Use a small maintainability-oriented refactor for empty-state markup plus focused CSS polish for the composer and message surfaces. Keep all existing chat behavior and anti-flicker streaming logic intact.

**Tech Stack:** Vanilla HTML/CSS/JS, Node test runner

---

## File Map

- `public/app.js`
  Add a reusable empty-state helper and keep render paths consistent.

- `public/styles.css`
  Refine empty-state, composer, and message-surface styles for a calmer conversation rhythm.

- `test/frontend-state.spec.js`
  Add empty-state helper coverage.

- `test/layout-contract.spec.js`
  Add CSS/markup contract checks for the new empty-state, composer, and message polish.

## Task 1: Add Failing Regression Tests

**Files:**
- Modify: `test/frontend-state.spec.js`
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write failing assertions for the reusable empty-state markup helper**
- [ ] **Step 2: Write failing layout-contract assertions for calmer empty-state, composer, and message rhythm**
- [ ] **Step 3: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js` and confirm the new assertions fail**

## Task 2: Implement Minimal Surface Polish

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Add the reusable empty-state helper and switch current render paths to it**
- [ ] **Step 2: Simplify the composer into a single primary input surface**
- [ ] **Step 3: Soften message-card hierarchy and reading rhythm**
- [ ] **Step 4: Re-run the targeted tests and confirm they pass**

## Task 3: Full Verification And Commit

**Files:**
- No additional file edits expected

- [ ] **Step 1: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js`**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Commit only this iteration’s files**
