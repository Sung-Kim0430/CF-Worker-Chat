# Top-Bar Sidebar Toggle Refresh Design

## Summary

This design refines the top-bar session-sidebar toggle so it feels more like a calm navigation control in a chat product and less like a command button.

The approved direction is:

- keep the control in the top bar
- switch to a **fixed visible label**
- add a **small neutral sidebar icon**
- use **state styling**, not changing button copy, to communicate expanded vs collapsed

The user explicitly approved the “icon + fixed label capsule button” direction.

## Problem

The current control works functionally, but it still feels overly operational:

- the desktop button swaps between “显示对话栏 / 隐藏对话栏”
- the changing copy makes the control feel like a command surface rather than workspace navigation
- text-length changes make the top bar feel slightly more mechanical than products like ChatGPT or Claude

For a chat-first personal site, the control should feel quiet, stable, and immediately recognizable.

## Design Goal

Make the sidebar toggle feel like part of a compact chat workspace header:

- stable
- low-noise
- recognizable at a glance
- visually aligned with the model controls

It should suggest “conversation navigation lives here”, not “click me to perform an operation”.

## Chosen Direction

### Visible Label

The visible label should stay fixed as:

- `对话记录`

This avoids width shifts and keeps the top bar calmer.

### Icon

The button should include a light sidebar / panel icon on the left.

Requirements:

- neutral stroke / fill treatment
- no emoji
- no decorative flourish
- sized to match compact desktop and mobile top-bar controls

### State Communication

The visible label should not change between expanded and collapsed states.

State should instead be expressed through:

- `aria-expanded`
- a slightly stronger active background when the sidebar is visible
- a quieter neutral background when the sidebar is hidden

### Accessibility

Although the visible label is fixed, the control should still expose clear state:

- keep `aria-expanded`
- keep `aria-controls="sessionSidebar"`
- keep focus-visible treatment
- preserve a touch target consistent with the existing top-bar controls

## Scope

This iteration should stay intentionally small.

### In Scope

- top-bar sidebar toggle markup refinement
- sidebar toggle helper copy refinement
- compact icon styling
- quieter navigation-style button states
- regression coverage for the fixed-label contract

### Out of Scope

- sidebar layout redesign
- model picker redesign
- chat history row redesign
- streaming behavior changes
- message rendering changes

## Implementation Notes

- keep the existing open/close behavior unchanged
- avoid mutating button `textContent` directly once icon markup is present
- update only the label node and ARIA state
- keep the rest of the top bar visually balanced with minimal CSS changes
