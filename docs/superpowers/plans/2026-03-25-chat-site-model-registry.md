# Chat-Style Site Model Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the current UI into a cleaner ChatGPT/Claude-style multi-model chat site, while adding a maintainable Workers AI model registry that can keep growing without cluttering the page.

**Architecture:** Keep the chat-first single-page experience, but replace the flat model list with a registry + selector architecture. Use a small featured set for the primary picker and move the full catalog into a searchable “more models” panel. Back the UI with richer model metadata and tests so future iterations can add new chat-capable Workers AI models without rewriting the interface.

**Tech Stack:** Cloudflare Workers, vanilla HTML/CSS/JS, Node.js test runner, Workers AI official model catalog docs.

---

### Task 1: Introduce model registry metadata and filtering helpers

**Files:**
- Modify: `src/lib/models.js`
- Create: `test/model-registry.spec.js`
- Modify: `test/models.spec.js`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run targeted tests to verify they fail**
- [ ] **Step 3: Add registry metadata for chat-safe models, featured models, and filtering helpers**
- [ ] **Step 4: Run targeted tests to verify they pass**
- [ ] **Step 5: Commit**

### Task 2: Expose a chat-site config shape that supports a clean featured picker plus expanded catalog

**Files:**
- Modify: `src/lib/models.js`
- Modify: `src/worker.js` (only if config shape handling needs adjustment)
- Modify: `test/config-endpoint.spec.js`

- [ ] **Step 1: Write the failing tests for config additions**
- [ ] **Step 2: Run targeted tests to verify they fail**
- [ ] **Step 3: Return featured models, full catalog metadata, and lightweight UI copy for the new selector**
- [ ] **Step 4: Run targeted tests to verify they pass**
- [ ] **Step 5: Commit**

### Task 3: Refactor the front-end into a cleaner chat-site model selection flow

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `test/layout-contract.spec.js`
- Modify: `test/frontend-state.spec.js`

- [ ] **Step 1: Write the failing tests for the cleaned-up model selector layout**
- [ ] **Step 2: Run targeted tests to verify they fail**
- [ ] **Step 3: Implement a clean featured model picker and a searchable/expandable more-models panel without crowding the main page**
- [ ] **Step 4: Keep streaming stability protections intact while wiring in the new selector behavior**
- [ ] **Step 5: Run targeted tests to verify they pass**
- [ ] **Step 6: Commit**

### Task 4: Encode future model-adaptation expectations into docs and maintenance hooks

**Files:**
- Modify: `README.md`
- Create: `docs/model-maintenance.md`
- Modify: `test/readme.spec.js`
- Create: `scripts/check-model-catalog.js`
- Create: `test/model-maintenance.spec.js`

- [ ] **Step 1: Write the failing tests for documentation and maintenance guidance**
- [ ] **Step 2: Run targeted tests to verify they fail**
- [ ] **Step 3: Document that future iterations should check the official Workers AI model catalog and prefer new chat-capable text-generation models**
- [ ] **Step 4: Add a lightweight local script/checklist scaffold for catalog review**
- [ ] **Step 5: Run targeted tests to verify they pass**
- [ ] **Step 6: Commit**

### Task 5: Full verification and integration polish

**Files:**
- Modify: any touched files above as needed after verification

- [ ] **Step 1: Run the full test suite**
- [ ] **Step 2: Run a fresh local dev smoke test (`npm run dev`)**
- [ ] **Step 3: Verify `/`, `/api/config`, and `/api/chat` behavior still matches expectations**
- [ ] **Step 4: Update any mismatched docs/copy discovered during verification**
- [ ] **Step 5: Commit and push**
