import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index.html exposes the sidebar history shell anchors", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  for (const id of [
    "topBar",
    "topBarSurface",
    "chatWorkspace",
    "chatColumnSurface",
    "modelPicker",
    "featuredModelList",
    "modelCatalogToggle",
    "modelCatalogPanel",
    "modelCatalogSurface",
    "modelSearchInput",
    "modelCatalogList",
    "sessionSidebar",
    "sessionSidebarHeader",
    "sessionSidebarContent",
    "sessionSidebarToggle",
    "sessionSidebarCloseButton",
    "sessionSearchInput",
    "sessionSearchClearButton",
    "sessionSearchMeta",
    "sessionList",
    "newChatButton",
    "clearAllSessionsButton",
    "chatForm",
    "chatComposerShell",
    "chatHistory",
    "chatHistorySurface",
    "userInput",
    "sendButton",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  for (const removedId of [
    "sessionSummary",
    "composerPresets",
    "starterPrompts",
    "workspaceBadges",
    "appTitle",
    "appSubtitle",
    "modelCatalogPreview",
  ]) {
    assert.doesNotMatch(html, new RegExp(`id="${removedId}"`));
  }

  assert.match(html, /skip-link/);
});

test("index.html loads the syntax highlighting assets for completed fenced code blocks", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  assert.match(html, /highlight\.js/i);
  assert.match(html, /styles\/github-dark|min\.css/i);
});

test("index.html keeps the shell intentionally minimal without decorative chrome blocks", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  assert.doesNotMatch(html, /page-orb/);
  assert.doesNotMatch(html, /tips-panel/);
});

test("app.js renders session row actions behind a quieter more-actions trigger", () => {
  const script = fs.readFileSync("public/app.js", "utf8");

  assert.match(script, /data-session-action="toggle-menu"/i);
  assert.match(script, /aria-label="更多操作"/i);
  assert.match(script, /class="session-action-popover"/i);
});

test("index.html keeps the desktop sidebar toggle as a dedicated control instead of a mobile-only button", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  assert.match(
    html,
    /id="sessionSidebarToggle"[^>]*class="ghost-button compact-button sidebar-toggle-button"/i,
  );
  assert.doesNotMatch(
    html,
    /id="sessionSidebarToggle"[^>]*class="[^"]*mobile-only-button/i,
  );
  assert.match(
    html,
    /id="sessionSidebarCloseButton"[^>]*class="ghost-button compact-button mobile-only-button"/i,
  );
});

test("styles.css includes reduced-motion safeguards for animated UI", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /animation:\s*none/);
  assert.match(styles, /transition:\s*none/);
});

test("styles.css removes decorative streaming animations that can amplify flicker", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.doesNotMatch(styles, /@keyframes rise-in/);
  assert.doesNotMatch(styles, /@keyframes pulse/);
});

test("styles.css centers the empty-state copy within the chat area", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.empty-state\s*\{[^}]*display:\s*grid/i);
  assert.match(styles, /\.empty-state\s*\{[^}]*place-items:\s*center/i);
  assert.match(styles, /\.empty-state\s*\{[^}]*text-align:\s*center/i);
});

test("styles.css keeps the active sidebar session understated and app-like", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-option\.active\s*\{[^}]*box-shadow:\s*none/i);
  assert.match(styles, /\.session-option\.active\s*\{[^}]*background:\s*rgba\(/i);
  assert.match(styles, /\.session-option\.active::before\s*\{[^}]*width:\s*3px/i);
});

test("styles.css keeps featured model pills compact and low-noise", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.featured-model-list\s+\.model-choice\s*\{[^}]*min-height:\s*30px/i);
  assert.match(styles, /\.featured-model-list\s+\.model-choice\s*\{[^}]*border-radius:\s*12px/i);
  assert.match(styles, /\.featured-model-list\s+\.model-choice\.active\s*\{[^}]*box-shadow:\s*none/i);
});

test("styles.css supports collapsing the desktop session sidebar from the chat shell", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /#chatWorkspace\[data-sidebar-collapsed="true"\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/i);
  assert.match(styles, /#chatWorkspace\[data-sidebar-collapsed="true"\]\s+#sessionSidebar\s*\{[^}]*display:\s*none/i);
});

test("styles.css keeps the sidebar session list dense and low-chrome", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-list\s*\{[^}]*gap:\s*10px/i);
  assert.match(styles, /\.session-group-list\s*\{[^}]*gap:\s*2px/i);
  assert.match(styles, /\.session-group-label\s*\{[^}]*text-transform:\s*uppercase/i);
  assert.match(styles, /\.session-option\s*\{[^}]*border-radius:\s*14px/i);
  assert.match(styles, /\.session-option-trigger\s*\{[^}]*padding:\s*10px 44px 10px 12px/i);
});

test("styles.css gives sidebar session titles and timestamps a clearer reading hierarchy", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-option-title-row\s*\{[^}]*gap:\s*8px/i);
  assert.match(styles, /\.session-option-title-row\s*\{[^}]*align-items:\s*baseline/i);
  assert.match(styles, /\.session-option small\s*\{[^}]*font-size:\s*0\.72rem/i);
  assert.match(styles, /\.session-option small\s*\{[^}]*text-align:\s*right/i);
});

test("styles.css keeps the composer compact and quieter than the chat surface", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.composer\s*\{[^}]*padding:\s*10px/i);
  assert.match(styles, /\.composer\s*\{[^}]*border-radius:\s*20px/i);
  assert.match(styles, /#userInput\s*\{[^}]*min-height:\s*72px/i);
  assert.match(styles, /\.composer-actions\s*\{[^}]*margin-top:\s*8px/i);
});

test("styles.css keeps the sidebar header shaped like a compact workspace control rail", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-sidebar-header\s*\{[^}]*padding:\s*8px 8px 6px/i);
  assert.match(styles, /\.sidebar-new-chat-button\s*\{[^}]*min-height:\s*42px/i);
  assert.match(styles, /\.session-search-field\s*\{[^}]*border-radius:\s*16px/i);
});

test("styles.css keeps sidebar search and footer controls flatter than the main chat surfaces", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-search-field\s*\{[^}]*padding:\s*2px/i);
  assert.match(styles, /\.session-search-field\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)/i);
  assert.match(styles, /\.session-search-clear-button\s*\{[^}]*min-height:\s*38px/i);
  assert.match(styles, /\.sidebar-secondary-action\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.46\)/i);
});

test("styles.css keeps sidebar hover and active rows soft instead of button-like", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-option:hover\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)/i);
  assert.match(styles, /\.session-option.active\s*\{[^}]*border-color:\s*transparent/i);
  assert.match(styles, /\.session-option.active\s*\{[^}]*background:\s*rgba\(244,\s*247,\s*255,\s*0\.82\)/i);
  assert.match(styles, /\.session-option.active::before\s*\{[^}]*background:\s*rgba\(37,\s*99,\s*235,\s*0\.42\)/i);
});

test("styles.css centers desktop chat reading width for calmer conversation rhythm", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.chat-history-surface\s*\{[^}]*width:\s*min\(100%,\s*960px\)/i);
  assert.match(styles, /\.chat-composer-shell\s*\{[^}]*width:\s*min\(100%,\s*960px\)/i);
  assert.match(styles, /\.message-card\s*\{[^}]*max-width:\s*min\(82%,\s*74ch\)/i);
});

test("styles.css keeps the top bar low-chrome and focused on model switching", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.top-bar\s*\{[^}]*padding:\s*6px/i);
  assert.match(styles, /\.model-picker\s*\{[^}]*padding:\s*3px 4px/i);
  assert.match(styles, /#sessionSidebarToggle,\s*#modelCatalogToggle\s*\{[^}]*min-height:\s*32px/i);
});

test("styles.css keeps the sidebar toggle readable on desktop and gives the hidden-sidebar state a quiet cue", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.sidebar-toggle-button\s*\{[^}]*display:\s*inline-flex/i);
  assert.match(styles, /\.sidebar-toggle-button\s*\{[^}]*white-space:\s*nowrap/i);
  assert.match(styles, /#sessionSidebarToggle\[aria-expanded="false"\]\s*\{[^}]*color:\s*var\(--ink\)/i);
  assert.match(styles, /#sessionSidebarToggle\[aria-expanded="false"\]\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)/i);
});

test("styles.css keeps sidebar row actions quiet and precise", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-option-actions\s*\{[^}]*gap:\s*4px/i);
  assert.match(styles, /\.session-inline-action\s*\{[^}]*min-height:\s*26px/i);
  assert.match(styles, /\.session-inline-action\s*\{[^}]*border-radius:\s*9px/i);
});

test("styles.css keeps session action menus compact and hidden until explicitly opened", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-inline-action-menu\s*\{[^}]*min-width:\s*30px/i);
  assert.match(styles, /\.session-inline-action-menu\s*\{[^}]*justify-content:\s*center/i);
  assert.match(styles, /\.session-action-popover\s*\{[^}]*position:\s*absolute/i);
  assert.match(styles, /\.session-option-actions\[data-open="true"\]\s+\.session-action-popover\s*\{[^}]*opacity:\s*1/i);
});

test("styles.css keeps the model catalog panel compact and search-first", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.model-catalog-panel\s*\{[^}]*padding:\s*6px/i);
  assert.match(styles, /\.model-catalog-surface\s*\{[^}]*padding:\s*5px/i);
  assert.match(styles, /\.model-search-input\s*\{[^}]*min-height:\s*42px/i);
  assert.match(styles, /\.catalog-option\s*\{[^}]*border-radius:\s*12px/i);
});

test("styles.css keeps chat messages calm and readable without oversized bubbles", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.chat-history\s*\{[^}]*gap:\s*16px/i);
  assert.match(styles, /\.message-card\s*\{[^}]*padding:\s*15px 16px/i);
  assert.match(styles, /\.message-content\s*\{[^}]*line-height:\s*1\.72/i);
});

test("styles.css keeps message meta quiet and information-dense", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.message-meta\s*\{[^}]*gap:\s*10px/i);
  assert.match(styles, /\.message-role\s*\{[^}]*font-size:\s*0\.76rem/i);
  assert.match(styles, /\.message-pill\s*\{[^}]*font-size:\s*0\.71rem/i);
});

test("styles.css keeps the mobile shell compact without crowding the composer", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /@media \(max-width:\s*820px\)\s*\{[\s\S]*?\.top-bar,\s*\.chat-column\s*\{[\s\S]*?padding:\s*16px/i);
  assert.match(styles, /@media \(max-width:\s*640px\)\s*\{[\s\S]*?#userInput\s*\{[\s\S]*?min-height:\s*88px/i);
  assert.match(styles, /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.page-shell\s*\{[\s\S]*?width:\s*min\(100vw - 16px,\s*100%\)/i);
});

test("styles.css keeps the model catalog list switcher-like and compact", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.model-catalog-list\s*\{[^}]*display:\s*grid/i);
  assert.match(styles, /\.model-catalog-list\s*\{[^}]*gap:\s*6px/i);
  assert.match(styles, /\.catalog-option\s*\{[^}]*padding:\s*10px 12px/i);
  assert.match(styles, /\.catalog-option\.active\s*\{[^}]*box-shadow:\s*none/i);
});

test("styles.css gives markdown answers readable list, quote and table rhythm", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.message-content\s+blockquote\s*\{[^}]*border-left:\s*3px solid/i);
  assert.match(styles, /\.message-content\s+(?:ul|ol)\s*\{[^}]*padding-left:\s*1\.2em/i);
  assert.match(styles, /\.message-content\s+table\s*\{[^}]*display:\s*block/i);
  assert.match(styles, /\.message-content\s+table\s*\{[^}]*overflow-x:\s*auto/i);
});

test("styles.css keeps the model catalog empty state and row rhythm understated", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.catalog-empty\s*\{[^}]*text-align:\s*center/i);
  assert.match(styles, /\.catalog-empty\s*\{[^}]*padding:\s*18px 10px/i);
  assert.match(styles, /\.catalog-option\s*\{[^}]*display:\s*grid/i);
  assert.match(styles, /\.catalog-option\s*\{[^}]*gap:\s*4px/i);
});

test("styles.css gives markdown answers gentle heading and divider hierarchy", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.message-content\s+h2\s*\{[^}]*font-size:\s*1\.02rem/i);
  assert.match(styles, /\.message-content\s+h3\s*\{[^}]*font-size:\s*0\.96rem/i);
  assert.match(styles, /\.message-content\s+hr\s*\{[^}]*border-top:\s*1px solid/i);
  assert.match(styles, /\.message-content\s+strong\s*\{[^}]*font-weight:\s*700/i);
});

test("styles.css keeps model catalog providers chip-like and descriptions compact", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.catalog-option\s+small\s*\{[^}]*display:\s*inline-flex/i);
  assert.match(styles, /\.catalog-option\s+small\s*\{[^}]*font-size:\s*0\.72rem/i);
  assert.match(styles, /\.catalog-option-copy\s*\{[^}]*-webkit-line-clamp:\s*2/i);
});

test("styles.css keeps user and assistant bubbles balanced for final reading rhythm", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.message-card\.user\s*\{[^}]*max-width:\s*min\(72%,\s*62ch\)/i);
  assert.match(styles, /\.message-card\.assistant\s*\{[^}]*max-width:\s*min\(80%,\s*72ch\)/i);
  assert.match(styles, /\.message-content\s+pre\s*\{[^}]*margin:\s*0\.95em 0/i);
});

test("styles.css keeps sidebar session actions floating so titles do not stay compressed", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-option\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/i);
  assert.match(styles, /\.session-option-trigger\s*\{[^}]*padding:\s*10px 44px 10px 12px/i);
  assert.match(styles, /\.session-option-actions\s*\{[^}]*position:\s*absolute/i);
  assert.match(styles, /\.session-option-actions\s*\{[^}]*inset-inline-end:\s*8px/i);
});

test("styles.css keeps the sidebar shell flatter and assistant cards quieter for a cleaner chat workspace", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /\.session-sidebar\s*\{[^}]*padding:\s*8px/i);
  assert.match(styles, /\.session-sidebar\s*\{[^}]*border-radius:\s*20px/i);
  assert.match(styles, /\.message-card\s*\{[^}]*box-shadow:\s*0 5px 12px rgba\(15,\s*23,\s*42,\s*0\.03\)/i);
  assert.match(styles, /\.message-card\.assistant\s*\{[^}]*border-color:\s*rgba\(15,\s*23,\s*42,\s*0\.055\)/i);
});
