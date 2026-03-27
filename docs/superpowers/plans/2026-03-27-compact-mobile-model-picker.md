# Compact Mobile Model Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the small-screen model picker feel like part of the same compact top bar as the sidebar toggle, while keeping the current model workflow and catalog entry point.

**Architecture:** Leave HTML and JS behavior unchanged unless a selector hook becomes strictly necessary. Constrain the work to small-screen CSS refinements for top-bar alignment, featured-model chip rhythm, and the `更多模型` button sizing.

**Tech Stack:** Vanilla HTML/CSS/JS, Node test runner

---

## File Map

- `public/styles.css`
  Add small-screen model-picker refinements for alignment, spacing, chip sizing, and compact catalog-toggle treatment.

- `test/layout-contract.spec.js`
  Add a regression contract for the compact small-screen model picker.

## Task 1: Add Failing Small-Screen Model-Picker Contract Tests

**Files:**
- Modify: `test/layout-contract.spec.js`

- [ ] **Step 1: Write failing assertions for small-screen model-picker compactness**
- [ ] **Step 2: Run `node --test test/layout-contract.spec.js` and confirm they fail**

## Task 2: Implement Minimal CSS Refinements

**Files:**
- Modify: `public/styles.css`

- [ ] **Step 1: Tighten top-bar alignment so the model cluster reads as part of the same header**
- [ ] **Step 2: Reduce chip spacing and padding on narrow screens**
- [ ] **Step 3: Compact the `更多模型` button to match the chip rhythm**
- [ ] **Step 4: Re-run `node --test test/layout-contract.spec.js` and confirm it passes**

## Task 3: Full Verification

**Files:**
- No additional file edits expected

- [ ] **Step 1: Run `node --test test/frontend-state.spec.js test/layout-contract.spec.js`**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Commit only this iteration’s files**
