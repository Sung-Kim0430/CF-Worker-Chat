# Minimal Chat Shell With Top-Bar Models And Local Sessions Design

## Summary

This design replaces the current “product demo workspace” shell with a much more focused AI chat interface.

The approved direction is:

- a **single-column chat layout**
- **model switching moved into the top bar**
- **client-side local session persistence** for multiple conversations
- **manual clearing of all local conversations**
- removal of marketing-style and guidance-heavy copy so the page primarily exposes:
  - model switching
  - conversation history
  - message input

The user explicitly asked to keep only the essential experience and remove unnecessary explanatory text.

## Why This Iteration Exists

The current UI is stable and functionally richer than earlier versions, but it still carries too much product framing for the user’s goal.

Specific friction in the current experience:

1. **Too much shell copy**
   - title, subtitle, badges, session summary, quick-start prompts, and helper text all compete with the actual task of chatting

2. **Model selection is visually separate from the primary workflow**
   - the right rail works, but it makes the product feel more like a dashboard than a chat tool

3. **Conversation continuity is fragile**
   - the browser currently keeps the active chat only in memory
   - a refresh or browser restart loses useful context

4. **The product identity is stronger than the actual utility surface**
   - the user wants the page to behave more like ChatGPT or Claude:
     - less explanation
     - less decoration
     - more direct use

## Design Goal

Turn the app into a **clean, chat-first interface** where the user sees almost nothing except:

- the current model
- the current or recent local conversations
- the chat itself

The design should feel:

- minimal
- fast
- calm
- product-like

It should not feel like:

- a landing page
- a dashboard with auxiliary panels
- a guided onboarding surface

## Chosen Direction

### Layout

The page becomes a **single main chat column**.

The existing right rail is removed. Its useful controls are redistributed into a compact top bar:

- model selection
- conversation history entry point
- new conversation

The rest of the page is dedicated to:

- chat history
- composer

### Top Bar Principles

The top bar should be a compact control strip, not a banner.

It should contain:

- a model switcher
- a “history” trigger
- a “new chat” trigger

It should not contain:

- site title
- subtitle
- workspace badges
- product marketing copy

### Main Chat Principles

The conversation area should remain the visual priority.

It should continue to support:

- streaming replies
- code block enhancement for completed replies
- copy / line numbers / collapse interactions

It should no longer be preceded by heavy session-summary content.

### Empty State Principles

The empty state should become extremely light.

Acceptable empty-state behavior:

- a very short line of copy, or
- only the composer placeholder

It should not contain multiple labels, product explanation, or tutorial-style copy.

## Local Session Persistence

### Storage Choice

Client persistence should use **`localStorage`**, not cookies.

Reasons:

- the data is browser-local and should not be sent with network requests
- conversation payloads are too large and too dynamic for cookie usage
- `localStorage` fits the “personal chat site / client-side history” goal better

### Persistence Scope

The approved direction is **multiple local sessions**, not only one active thread.

The browser should store:

- a list of sessions
- the active session id
- the selected model per session
- existing per-session code-block UI state where practical

### Session Model

Each local session should include:

- `id`
- `title`
- `createdAt`
- `updatedAt`
- `history`
- `modelId`
- `expandedCodeBlocks`

The title should be derived automatically from the first user message. No manual naming UI is needed.

### Local Limits

To protect stability and storage size:

- keep at most **20 sessions**
- keep at most **100 messages per session**
- trim the oldest sessions and/or oldest messages when limits are exceeded

These values are implementation defaults and can be adjusted later if usage shows they are too small.

## Conversation Management UX

### New Chat

The top bar should provide a direct “new chat” action.

When triggered:

- create a fresh empty local session
- switch to it immediately
- keep the current model selection behavior predictable
- focus the input

### History Entry

The top bar should provide a compact history trigger that opens a lightweight list or popover.

That history UI should show:

- local session title
- last updated time
- active-session indication

Switching sessions should:

- replace the visible chat history
- restore the session’s selected model
- restore the session’s expanded code-block state if present

### Clear All Conversations

The user requested a manual “clear all conversations” function.

This should be available inside the history UI rather than as persistent loud chrome in the main layout.

Behavior:

- require confirmation
- delete all locally stored sessions
- clear the active in-memory session state
- create one fresh empty session

This preserves simplicity while still keeping destructive actions discoverable.

## Model Switching Behavior

### Placement

Model selection moves from the right rail to the top bar.

### Behavior

Model selection should be stored at the **session level**.

That means:

- each session remembers its last selected model
- switching between sessions restores the associated model
- if a saved model no longer exists, fall back to the current default model

### Catalog Strategy

The interface still needs to support many Workers AI models over time, but the top bar must stay compact.

Recommended behavior:

- keep a compact featured selector in the top bar
- allow opening a minimal searchable model panel from that selector if needed
- avoid a large always-visible model explanation card

This preserves scalability without restoring dashboard clutter.

## UI Elements To Remove Or Compress

The following current elements should be removed entirely from the page shell:

- header title
- subtitle
- workspace badges
- session summary block
- quick-start prompt section
- right-rail layout

The following should be compressed heavily:

- model metadata copy
- hidden-model preview copy
- composer helper text

The final shell should communicate through control labels rather than paragraphs.

## Error And Recovery Behavior

### Storage Read Failure

If local session data is unreadable or invalid:

- ignore the broken payload
- rebuild a valid empty state
- do not block page load

### Storage Write Failure

If persistence fails:

- keep the in-memory UI working
- avoid crashing the chat
- optionally log a warning in development

### Missing Saved Model

If a restored session references a model no longer present in the catalog:

- fall back to the default enabled model

### Existing Stream Stability

The current stability rule remains unchanged:

- streaming assistant replies stay in plain-text mode
- Markdown enhancement runs only after completion

This design must not reintroduce reply-time flicker.

## Testing Expectations

The implementation should add or update automated coverage for:

1. **Layout contract**
   - old chrome blocks are removed
   - top bar now hosts model and session controls

2. **Session persistence**
   - multiple sessions save and restore from local storage
   - active session restoration works
   - per-session model restoration works

3. **Clear-all flow**
   - all local sessions are removed
   - a fresh empty session is recreated

4. **Regression safety**
   - code block enhancements still work on completed replies
   - streaming path still avoids heavy HTML enhancement

## Success Criteria

This iteration is successful when:

- the page no longer looks like a presentation surface
- model switching is available in the top bar
- chat history survives reloads through local browser storage
- multiple local sessions can be restored and switched
- all local sessions can be cleared manually
- the page remains visually quiet and operationally stable
