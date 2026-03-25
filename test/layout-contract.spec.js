import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index.html exposes the playground layout anchors", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  for (const id of [
    "workspaceHeader",
    "sessionSummary",
    "sessionMeta",
    "composerPresets",
    "composerActions",
    "starterPrompts",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("styles.css includes reduced-motion safeguards for animated UI", () => {
  const styles = fs.readFileSync("public/styles.css", "utf8");

  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /animation:\s*none/);
  assert.match(styles, /transition:\s*none/);
});
