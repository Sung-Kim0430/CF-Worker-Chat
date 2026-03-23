# Workers AI Chat Rebuild Design

## Summary

This project will be rebuilt from a single-file Cloudflare Worker into a standard, maintainable Workers AI chat application that:

- uses `@cf/zai-org/glm-4.7-flash` as the default model
- supports a curated set of additional chat-capable models through a backend whitelist
- improves the visual presentation so the app can be shown directly to customers
- hardens request validation, error handling, and streaming behavior for more reliable demos and day-to-day use
- replaces the current placeholder documentation with deployment-ready README content and a project-appropriate `.gitignore`

The primary user goals are:

- presentation quality suitable for demos
- production-oriented stability
- maintainable structure for future iteration

## Context

The current repository is a very small prototype:

- [README.md](/Users/sung-kim/Documents/Code/CF-Worker-Chat/README.md) contains only a title
- [workers.js](/Users/sung-kim/Documents/Code/CF-Worker-Chat/workers.js) mixes routing, API logic, SSE parsing, HTML, CSS, and browser JavaScript in one file
- [.gitignore](/Users/sung-kim/Documents/Code/CF-Worker-Chat/.gitignore) is a Visual Studio oriented template and does not match a Node + Wrangler + Cloudflare Worker project

This structure makes changes risky:

- model integration details are coupled to UI rendering
- the current REST + custom SSE parser path adds avoidable complexity
- UI improvements are harder because all browser assets are embedded in the Worker file
- the project is not documented as a Cloudflare Worker project

## Goals

### Functional Goals

- rebuild the app as a standard Cloudflare Worker project
- switch to Workers AI binding based model invocation through `env.AI.run(...)`
- support `@cf/zai-org/glm-4.7-flash` as the default chat model
- support additional curated models from Workers AI that fit the same chat interaction pattern
- expose an API that returns runtime configuration for the frontend
- preserve streaming chat behavior for responsive output

### Product Goals

- make the UI look intentional and presentation ready
- reduce first-use friction with suggested prompts and clearer affordances
- make model selection understandable for non-technical users
- present failures in product language instead of raw backend details

### Engineering Goals

- separate Worker, frontend, and model configuration responsibilities
- centralize validation and response helpers
- remove the need for handwritten Cloudflare REST API request plumbing
- create a README that another engineer can use to develop and deploy the project

## Non-Goals

- no user authentication in this iteration
- no persistent conversation storage in this iteration
- no knowledge base or retrieval augmented generation in this iteration
- no function calling UI in this iteration, even though the default model supports it
- no framework migration to Hono, React, or Vite in this iteration

## External References

The implementation should align with official Cloudflare documentation:

- Workers AI overview: `https://developers.cloudflare.com/workers-ai/`
- Workers AI bindings for Workers: `https://developers.cloudflare.com/workers-ai/configuration/bindings/`
- Workers + Wrangler getting started: `https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/`
- GLM-4.7-Flash model page: `https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/`
- Workers AI pricing: `https://developers.cloudflare.com/workers-ai/platform/pricing/`

The design assumes the official binding-based Worker integration path rather than direct Cloudflare REST API calls from inside the Worker.

## Proposed Project Structure

```text
CF-Worker-Chat/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ src/
│  ├─ worker.js
│  └─ lib/
│     ├─ chat.js
│     ├─ http.js
│     ├─ models.js
│     └─ static.js
├─ test/
│  ├─ chat.spec.js
│  └─ models.spec.js
├─ docs/
│  └─ superpowers/
│     └─ specs/
│        └─ 2026-03-23-workers-ai-chat-rebuild-design.md
├─ .gitignore
├─ README.md
├─ package.json
└─ wrangler.jsonc
```

### File Responsibilities

- `src/worker.js`
  Entry point. Routes requests for the page, runtime config, and chat API. Keeps logic shallow.

- `src/lib/chat.js`
  Validates chat input, truncates history, builds the model payload, and converts model output into a client-facing stream.

- `src/lib/models.js`
  Stores the model whitelist, labels, descriptions, and runtime selection helpers.

- `src/lib/http.js`
  Provides consistent JSON, streaming, error, and no-cache response helpers.

- `src/lib/static.js`
  Serves static assets cleanly when running the Worker without embedding the entire UI into a template string.

- `public/index.html`
  Provides the page shell, product framing, semantic sections, and accessible landmarks.

- `public/styles.css`
  Holds the visual system and responsive layout.

- `public/app.js`
  Handles user input, fetch calls, runtime config hydration, stream rendering, model switching, prompt suggestions, and user-facing error state transitions.

- `test/*.spec.js`
  Covers model configuration and critical request validation logic.

## Model Strategy

### Default Model

The default model will be:

- `@cf/zai-org/glm-4.7-flash`

Reasons:

- it is the explicit requested target model
- it is documented by Cloudflare Workers AI
- it supports a chat-style `messages` interface and streaming
- it is positioned as a fast general-purpose model appropriate for interactive chat

### Additional Models

The first implementation should support a small curated model set that shares a common chat request shape. The intended initial list is:

- `@cf/zai-org/glm-4.7-flash`
- `@cf/meta/llama-3.1-8b-instruct-fast`
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

Selection principles:

- models must have official Workers AI documentation
- models should be usable through the same general chat interaction path
- the list should stay small enough that non-technical users can understand the trade-offs

### Model Metadata

Each model entry should contain:

- `id`
- `label`
- `description`
- `contextWindow`
- `speedTag`
- `costTag`
- `recommendedFor`
- `enabled`

This metadata will drive both backend validation and frontend display.

### Why A Whitelist

A whitelist avoids two product risks:

- arbitrary client-supplied model IDs causing failures or unsupported payload shapes
- uncontrolled cost surprises caused by exposing every available model without curation

## API Design

### `GET /`

Returns the chat application shell and static assets.

### `GET /api/config`

Returns runtime configuration required by the browser:

- app title
- app subtitle
- default model
- enabled models
- input guidance text
- starter prompt suggestions
- optional product footer copy

This endpoint keeps frontend behavior configuration-driven instead of hardcoded.

### `POST /api/chat`

Accepts:

- `message`
- `history`
- `model`

Validation rules:

- `message` must be a non-empty string
- `history` must be an array of valid `{ role, content }` items
- `model` must be omitted or match a whitelisted enabled model
- history length must be capped
- individual content lengths must be capped

Response behavior:

- successful responses stream assistant text
- validation failures return structured JSON errors
- upstream model failures return safe, user-facing messages and a structured diagnostic code

## Data Flow

### Page Load

1. Browser requests `/`
2. Worker serves the application shell and static assets
3. Browser requests `/api/config`
4. Frontend hydrates model selector, starter prompts, product copy, and default state

### Chat Request

1. User enters a message and optionally chooses a model
2. Frontend sends `POST /api/chat`
3. Worker validates request shape and model choice
4. Worker builds `messages` from system prompt, truncated history, and user input
5. Worker calls `env.AI.run(selectedModel, { messages, stream: true, ... })`
6. Worker forwards streamed text back to the browser
7. Browser renders streamed Markdown progressively and finalizes the message once complete

## UI Direction

### Visual Positioning

The UI should feel like a small polished product, not a raw developer demo:

- clean, structured layout
- strong but restrained typography
- subtle depth in the background instead of a flat blank page
- concise model and status cues

### Layout

The page should include:

- a branded hero or header strip
- a short description of what the assistant can do
- a model selector with plain-language labels
- starter prompt cards
- the main chat transcript area
- an input composer with usage hints

### User Pain Points Addressed

- empty-state uncertainty
  The page will suggest prompts and explain the app in one glance.

- unclear model choice
  Model labels and descriptions will explain when to use each option.

- weak streaming feedback
  The UI will show a clear in-progress state while output is arriving.

- confusing failures
  Errors will be phrased as actionable product messages rather than raw stack details.

- weak mobile usability
  The layout and composer will be tuned for narrow viewports, keyboard overlap, and easier scanning.

### Interaction Behavior

- input supports multi-line entry with `Shift+Enter`
- `Enter` sends when the form is valid
- auto-scroll only follows the stream if the user is already near the bottom
- the send button disables during an active request
- the app surfaces which model answered the latest assistant turn
- the app supports resetting the current conversation

## Prompting Strategy

The Worker will prepend a focused system prompt that aims for:

- friendly but direct output
- Markdown formatting when it improves readability
- customer-safe responses that do not expose internal failure detail

This prompt should be short and generic enough to work across the curated model set.

## Stability and Error Handling

### Server Side

- invalid JSON bodies return `400`
- unsupported models return `400`
- missing Workers AI binding configuration returns `500` with a clear deployment-oriented message
- upstream generation errors are normalized into a bounded error response
- all non-HTML responses set `Cache-Control: no-store`

### Frontend

- network interruptions produce a retry-oriented message
- partial streamed content is preserved when possible
- user input is re-enabled even after failures
- transient error UI styles are visibly distinct from normal assistant output

### History Control

The Worker will keep only recent history within configured limits. The UI may warn that very long conversations can be compacted or truncated to maintain responsiveness.

## Maintainability Strategy

### Separation of Concerns

The rebuild should avoid large multi-purpose files. Each module must have a single clear responsibility.

### Configuration-Driven Behavior

Models, starter prompts, and product copy should be easy to adjust without hunting through unrelated code.

### Minimal Dependencies

Dependencies should stay intentionally small:

- Cloudflare tooling through `wrangler`
- one Markdown renderer and one sanitizer on the frontend if still needed
- lightweight test tooling only for the modules that benefit most from automated coverage

No framework should be introduced unless it clearly reduces complexity for this specific app.

## Documentation Plan

### `.gitignore`

Replace the existing Visual Studio oriented ignore list with one aligned to:

- Node.js
- Wrangler
- local environment files
- test coverage output
- macOS system files

### `README.md`

The README should include:

- project overview
- feature list
- screenshots or UI description if available
- directory structure
- prerequisites
- local development steps
- Workers AI binding setup
- supported models and guidance on how to add more
- deployment steps
- troubleshooting and common errors
- notes on pricing and model selection trade-offs

The README should be useful to both the original author and another engineer joining later.

## Testing Strategy

The first implementation should add focused automated checks for the most failure-prone logic:

- model whitelist lookup and default model behavior
- request validation for `message`, `history`, and `model`
- history truncation behavior
- config endpoint payload shape

These tests should be small and fast. The goal is confidence in core behavior, not broad framework coverage.

## Risks and Mitigations

### Risk: Model Payload Differences

Some Workers AI models use slightly different preferred request shapes.

Mitigation:

- only expose models that fit the same chat-oriented flow in the first version
- keep model metadata centralized so payload branching can be added later if needed

### Risk: Streaming Edge Cases

Different browser and Worker streaming paths can fail in subtle ways.

Mitigation:

- keep the stream pipeline simple
- centralize stream forwarding logic
- preserve graceful fallback messaging on interrupted streams

### Risk: UI Overreach

It is easy to over-design a small project and slow implementation.

Mitigation:

- keep the UI visually distinctive but technically simple
- prefer CSS variables, structured layout, and focused interactions over heavy animation or framework complexity

## Implementation Recommendation

Proceed with a standard Worker project rebuild, centered on `env.AI.run(...)`, a curated multi-model whitelist, and a product-oriented frontend. This provides the best balance of demo quality, reliability, and maintainability without introducing unnecessary framework overhead.
