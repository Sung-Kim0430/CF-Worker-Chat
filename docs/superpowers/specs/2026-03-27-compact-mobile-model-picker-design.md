# Compact Mobile Model Picker Design

## Summary

This design refines the small-screen model picker so it visually belongs to the same compact top-bar system as the sidebar toggle.

The approved direction is:

- keep the current top-bar model workflow
- keep the current `更多模型` access point
- keep visible model chips
- make the small-screen model area more compact, lower-noise, and more unified with the `对话记录` button

The user explicitly chose this direction after the mobile top-bar controls were tightened.

## Problem

The top bar is already much calmer than before, but the model area still feels slightly more separate than the sidebar toggle on small screens.

Specific friction:

- the model picker still reads a bit like a second block rather than part of one header strip
- chip rhythm is slightly roomier than needed on narrow screens
- the `更多模型` button and the featured-model chips do not yet feel fully like one compact control cluster

## Design Goal

Make the small-screen model picker feel like part of one coherent app header:

- tighter
- calmer
- still readable
- still horizontally stable
- still easy to tap

It should keep the current functionality and only refine presentation.

## Chosen Direction

### Keep The Current Workflow

Do not change:

- featured-model chips in the top bar
- `更多模型` entry point
- selected-state behavior
- model catalog opening behavior

### Tighten The Model Cluster

On small screens, the model cluster should:

- align more naturally with the sidebar toggle
- feel like a compact segmented control area
- reduce spacing and padding slightly
- keep chip sizes readable but less roomy
- keep overflow controlled so the top bar does not feel wider than the viewport

### Improve Header Unity

The top-bar row should feel more like one toolbar than two stacked modules.

Small-screen refinements should therefore emphasize:

- tighter chip rhythm
- softer, lighter model-picker container chrome
- more compact `更多模型` button sizing
- stable row alignment with the sidebar toggle

## Scope

### In Scope

- small-screen model-picker spacing
- small-screen featured-model chip sizing
- small-screen `更多模型` button compactness
- small-screen top-bar alignment refinement
- regression coverage for the compact model-picker contract

### Out of Scope

- model registry changes
- catalog behavior changes
- sidebar behavior changes
- desktop model-picker redesign
- new header interactions

## Implementation Notes

- prefer CSS-only refinement
- keep touch targets comfortably tappable
- avoid introducing horizontal page overflow
- preserve the current active-model emphasis without making the chips louder
