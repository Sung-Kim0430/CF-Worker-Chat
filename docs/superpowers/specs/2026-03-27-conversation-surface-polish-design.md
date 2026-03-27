# Conversation Surface Polish Design

## Summary

This design refines the core chat surface in three approved areas:

1. empty state / first screen
2. composer / input area
3. message area

The user-approved direction is **极简克制型**:

- closer to ChatGPT / Claude
- cleaner and lower-noise
- stable during streaming
- focused on conversation, model switching, and history

## Problem

The current product shell is already much cleaner than earlier versions, but the main conversation surface still feels slightly heavier than necessary:

- the empty state is centered but too bare to feel intentionally designed
- the composer still reads like a card inside a card
- message cards still carry more visual weight than the product tone requires

Together, those details make the app feel a little less calm and product-like than the user wants.

## Design Goal

Make the conversation area feel like a quiet working surface rather than a decorated interface.

The user should feel that:

- the first screen is centered and intentional
- the input box is the primary action surface without looking loud
- messages are easier to scan for long conversations
- streaming remains visually stable and does not reintroduce flicker

## Approaches Considered

### Option A — CSS-only softening

Keep the existing markup and only reduce contrast, radius, spacing, and shadows.

**Pros**
- lowest implementation risk
- fast to ship

**Cons**
- does not improve empty-state structure
- keeps the composer’s nested-card feel

### Option B — Small surface refactor with shared UI helpers **(chosen)**

Add a lightweight empty-state markup helper, simplify the composer into a single main input surface, and soften message hierarchy with minimal CSS adjustments.

**Pros**
- improves clarity and maintainability
- keeps changes focused
- supports better testing

**Cons**
- slightly more change than CSS-only polish

### Option C — Larger chat-shell redesign

Rebuild the conversation column layout and message presentation more aggressively.

**Pros**
- biggest visual change

**Cons**
- too risky for current goals
- more likely to regress streaming stability and familiar behavior

## Chosen Direction

### 1. Empty state / first screen

The empty state should feel calm and centered, not like onboarding chrome.

Changes:

- keep the centered layout
- replace the single loose line with a quiet heading + one supporting line
- avoid badges, tips, or decorative blocks
- reuse the same helper for config-error fallback states so empty-state markup stays maintainable

### 2. Composer / input area

The composer should become the main interaction surface, but with less visual nesting.

Changes:

- reduce the outer card treatment on the form
- make the input shell the main visible surface
- keep the send button inside the textarea shell
- use a cleaner focus-within state on the shell rather than stacking multiple borders and shadows

### 3. Message area

The message area should improve reading rhythm without becoming more decorative.

Changes:

- slightly soften message-card shadows and gradients
- make metadata hierarchy quieter
- tighten spacing so the conversation reads more like a working transcript
- preserve the current streaming patch behavior so assistant replies stay stable during generation

## Scope

### In Scope

- empty-state structure refinement
- composer surface refinement
- message rhythm and metadata polish
- regression coverage for the new layout contracts

### Out of Scope

- model routing changes
- sidebar information architecture changes
- streaming transport changes
- large animation additions

## Implementation Notes

- keep assistant streaming in plain-text mode until completion
- keep the current sidebar toggle, top-bar model picker, and local session persistence behavior
- prefer minimal HTML/CSS/JS changes
- add tests first, verify red, then implement the smallest change set needed
