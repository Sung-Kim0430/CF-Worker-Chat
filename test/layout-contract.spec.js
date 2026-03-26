import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index.html exposes the minimal top-bar chat shell anchors", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  for (const id of [
    "topBar",
    "chatWorkspace",
    "modelPicker",
    "featuredModelList",
    "modelCatalogToggle",
    "modelCatalogPanel",
    "modelSearchInput",
    "modelCatalogList",
    "sessionMenuToggle",
    "sessionMenuPanel",
    "sessionList",
    "newChatButton",
    "clearAllSessionsButton",
    "chatForm",
    "chatHistory",
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
