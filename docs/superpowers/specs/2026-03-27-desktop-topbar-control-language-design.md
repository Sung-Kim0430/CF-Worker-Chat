# Desktop Top-Bar Control-Language Design

## Summary

This design refines the desktop top bar so the sidebar toggle and the model-catalog entry follow the same visual language.

The approved direction is:

- keep the current top-bar workflow
- keep the current featured-model row
- make `更多模型` feel like the same kind of stable header control as `对话记录`
- align desktop and mobile control language more closely

## Problem

The top bar is already calmer than before, but one inconsistency remains:

- `对话记录` is now a stable icon-plus-label header control
- `更多模型` still behaves like an ordinary text button

This makes the toolbar feel partially unified rather than fully intentional.

## Design Goal

Make the desktop top bar read as one coherent app header.

The user should feel that:

- `对话记录`
- featured model chips
- `更多模型`

all belong to the same compact workspace-control system.

## Chosen Direction

### Stable Visible Label

The model-catalog toggle should keep a fixed visible label:

- `更多模型`

It should no longer switch visible copy to `收起模型`.

As with the sidebar toggle, open/closed state should be communicated through:

- `aria-expanded`
- quiet visual state styling

### Icon + Label Shell

The model-catalog toggle should gain:

- a small neutral icon
- stable label markup
- compact spacing matching the sidebar toggle

This keeps the toolbar visually consistent.

### Shared Header-Control Language

Desktop controls should feel like related siblings rather than mixed button types.

The model-catalog toggle therefore should:

- use the same compact icon-label rhythm
- keep low-noise chrome
- become slightly more app-like and less “utility button” in tone

## Scope

### In Scope

- model-catalog toggle markup refinement
- model-catalog toggle state-label refinement
- desktop top-bar control-style consistency
- regression coverage for the fixed-label model-catalog toggle contract

### Out of Scope

- model catalog behavior changes
- featured-model data changes
- sidebar behavior changes
- large top-bar layout changes

## Implementation Notes

- preserve current catalog open/close behavior
- update only the label node when rerendering state
- keep desktop and mobile CSS compatible with the current compact top-bar work
