# Compact Mobile Top-Bar Refinement Design

## Summary

This design refines the top bar for small screens after the sidebar toggle was turned into a stable icon-plus-label navigation control.

The approved direction is:

- keep the visible label `对话记录`
- do **not** collapse the control to icon-only mode
- make the mobile top bar feel lighter, tighter, and more like a mature chat app header

The user explicitly chose the “keep the label, but make the compact layout lighter” direction.

## Problem

The current top bar works, but on smaller widths it still feels heavier than necessary:

- some controls become too block-like
- the control rhythm looks more stacked than app-like
- the sidebar toggle and model controls feel less integrated than they do on desktop

The issue is not functionality. It is compactness and header rhythm.

## Design Goal

Preserve clarity while reducing visual weight on narrow screens.

The mobile header should feel:

- compact
- calm
- still readable
- still obviously interactive

It should keep the current semantics and not introduce hidden navigation.

## Chosen Direction

### Keep Visible Label

The sidebar toggle keeps:

- icon
- visible label `对话记录`

This preserves recognizability on mobile and avoids reducing discoverability.

### Reduce Blockiness

On small screens, the header should stop feeling like two oversized rows of controls.

The compact treatment should:

- keep top-bar controls horizontally balanced where practical
- remove unnecessary full-width button behavior for top-bar controls
- tighten spacing, padding, and icon-label rhythm
- keep model controls visually lighter and closer to the toggle

### Preserve Model Discoverability

The model area should stay compact but still support:

- featured model scrolling
- model catalog access
- the current top-bar-first workflow

This is a visual compression pass, not a workflow change.

## Scope

### In Scope

- small-screen top-bar spacing refinement
- small-screen sidebar-toggle compactness refinement
- model-picker compactness refinement
- regression coverage for the mobile compact-header contract

### Out of Scope

- model picker redesign
- sidebar behavior changes
- input/composer changes
- streaming/rendering changes
- icon-only mobile navigation

## Implementation Notes

- prefer CSS-only layout refinement
- keep HTML and JS changes minimal or zero unless a selector/state hook is needed
- use targeted top-bar overrides instead of global mobile button changes where possible
- preserve the current accessibility semantics and visible label
