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

  assert.match(styles, /\.featured-model-list\s+\.model-choice\s*\{[^}]*min-height:\s*32px/i);
  assert.match(styles, /\.featured-model-list\s+\.model-choice\s*\{[^}]*border-radius:\s*14px/i);
  assert.match(styles, /\.featured-model-list\s+\.model-choice\.active\s*\{[^}]*box-shadow:\s*none/i);
});

test("styles.css supports collapsing the desktop session sidebar from the chat shell", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /#chatWorkspace\[data-sidebar-collapsed="true"\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/i);
  assert.match(styles, /#chatWorkspace\[data-sidebar-collapsed="true"\]\s+#sessionSidebar\s*\{[^}]*display:\s*none/i);
});
