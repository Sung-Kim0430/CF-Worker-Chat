# Model catalog and chat workspace refresh

**Goal:** Refresh ignore rules and Cloudflare chat models; provide persistent system/light/dark appearance, readable model metadata, cancellation and Markdown export.

**Architecture:** Keep the static model registry and Workers AI messages binding. Add small modules for appearance, session export and official catalog comparison. Keep the existing session storage format and migrate unavailable saved selections to the default model, without automatically selecting a paid replacement.

**Tech stack:** Vanilla ES modules, CSS custom properties, Cloudflare Workers AI, Node test runner, Playwright CLI.

## Decisions

- Static, reviewed registry is preferred over dynamically exposing every remote model: the UI only supports text chat and some catalog models need access approval or different inputs.
- Optional live catalog checking uses official model cards plus the explicit active variants in Cloudflare's deprecation notice. Unknown/missing catalog entries fail the check; new models are suggestions requiring schema review.
- Appearance offers system/light/dark; user chose light/dark switching. Initialize before paint, retain preference locally and handle denied storage.
- Retain GLM 4.7 Flash as default and Llama 3.1 Fast (explicitly still active). Replace deprecated Gemma 3 and Kimi K2.5; add nine verified chat models. Keep five featured options.
- Label paid access; show the model's documented context capacity without implying the app sends unlimited history. Existing 12-message/12,000-character request limits remain documented.
- Stop uses AbortController, retains partial content, excludes empty interruption notices from request history, and unlocks controls.
- Export one session as Markdown from its action menu, preserving code and per-turn model labels and omitting transient failure notices.

## Work and validation

- [x] Extend `.gitignore` for environment variants, secrets, build output, local agent/browser artifacts; retain lockfile and environment examples. Per user request, ignore `.codex/`, `.agents/` and other common coding-assistant directories.
- [x] Add behavior tests for new/removed models, SSE errors/Responses deltas, appearance storage fallback, export and official catalog comparison. Run targeted tests to confirm failures first.
- [x] Update `src/lib/models.js`, catalog check script and maintenance docs. Verify new schemas and paid-access metadata against official model pages (2026-10-13).
- [x] Implement `public/lib/appearance.js`, `public/lib/session-export.js`, stream error handling and cancellation; integrate compact controls and model metadata in `public/index.html` and `public/app.js`.
- [x] Add theme tokens and scoped overrides in `public/styles.css`; verify reading contrast, focus, mobile overflow and reduced motion.
- [x] Run `npm test`, offline and online model checks, Wrangler deploy dry run, browser flows at 375/768/1024/1440 px in both themes; check cancellation, export and preference restoration.
- [x] Review diff and update README with the final model list, functionality and validation limitations. Leave changes in the workspace for review.

## Verified result

- 125 Node tests pass; 0 failures.
- Offline registry summary and online official review pass: 24 catalog models / 5 featured, no missing IDs. Llama 3.1 Fast is explicitly reported as an active-variant exception.
- Wrangler deploy dry run succeeds with AI and ASSETS bindings; no deployment performed.
- Browser verifies both themes at 375 / 768 / 1024 / 1440 px, system preference changes, refresh persistence, model search and paid-access labeling, partial and empty cancellation, stream errors and continued requests, code rendering and actual Markdown download.
- Long history scrolls separately from the composer; page height remains equal to viewport height. Checked the 960 / 961 / 970 / 980 px drawer boundary after the reviewer identified and we fixed a mismatched breakpoint.
- Browser console: 0 errors / 0 warnings. Screenshots, downloaded Markdown and command outputs are under ignored `output/`.
- Fresh code review found no other important issues. Live inference and account-specific access are not established by local SSE tests or catalog validation.
