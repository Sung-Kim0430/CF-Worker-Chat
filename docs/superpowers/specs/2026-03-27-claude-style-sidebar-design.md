# Claude-Style Sidebar Design

## Summary

This design refines the left conversation-history sidebar toward a calmer, Claude-like feel.

The approved direction is:

- Claude-style
- more relaxed rather than denser
- preserve a one-line summary
- keep the interface minimal and quiet

## Problem

The current sidebar is functional, but it still feels slightly more “utility panel” than “mature chat workspace”.

Three issues remain:

- session title truncation is not always graceful enough
- active rows still feel a bit too button-like
- time and grouping are readable, but not yet as calm or compact as they could be

## Design Goal

Make the sidebar feel closer to Claude’s conversation list:

- calm
- lightly structured
- easy to scan
- no noisy chrome

Users should be able to:

- recognize the right chat quickly
- distinguish active and hover states naturally
- understand recency without oversized timestamps

## Approaches Considered

### Option A — Pure CSS restyle

Keep the current rendering structure and only soften spacing, colors, and hover states.

**Pros**
- lowest implementation risk
- very small change set

**Cons**
- does not address duplicate title/preview problems
- does not improve timestamp compactness

### Option B — Small rendering-model refinement plus CSS polish **(chosen)**

Introduce a lightweight display-model helper for sidebar rows, use a more compact row-time label, and simplify each row to title + secondary line.

**Pros**
- improves readability and maintainability
- solves the “duplicate title / preview” problem more cleanly
- keeps the visual surface calm

**Cons**
- slightly broader than CSS-only work

### Option C — Larger sidebar redesign

Rebuild the full sidebar information architecture, actions, and grouping treatment.

**Pros**
- biggest visual shift

**Cons**
- unnecessary for current scope
- higher regression risk

## Chosen Direction

### 1. More relaxed row structure

Each session row should read as:

- title + compact time label
- one secondary line

The current extra meta line should be removed from the default row layout. This keeps the sidebar calmer and more Claude-like.

### 2. Smarter secondary text

The secondary line should prefer a useful summary, but avoid repeating the same text as the title.

Rules:

- if preview meaningfully differs from the title, show the preview
- if preview mostly duplicates the title, fall back to a quiet model label
- if neither is useful, fall back to an empty-chat placeholder

This makes truncation feel smarter without introducing complex UI.

### 3. Compact row timestamps

The row-level timestamp should be more compact than the general session-updated label.

Examples:

- `刚刚`
- `10分钟前`
- `09:05`
- `昨天`
- `周二`
- `03-24`

Grouping still remains:

- 今天
- 昨天
- 7 天内
- 30 天内
- 更早

### 4. More natural active state

The selected row should feel active, but not pressed like a button.

Changes:

- lighter active background
- subtler left indicator
- calmer hover state
- slightly softer group spacing and label treatment

## Scope

### In Scope

- session row display-model helper
- compact sidebar time-label helper
- calmer Claude-style row styling
- regression coverage for row text selection and compact time labels

### Out of Scope

- session storage changes
- search logic changes
- action-menu behavior changes
- mobile drawer behavior changes

## Implementation Notes

- keep current session sorting by `updatedAt`
- keep search highlighting behavior
- keep rename and action-menu workflows unchanged
- prefer small helper extraction over large refactors in `public/app.js`
