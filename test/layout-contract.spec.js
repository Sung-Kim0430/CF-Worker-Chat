import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index.html exposes the playground layout anchors", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  for (const id of [
    "workspaceHeader",
    "sessionSummary",
    "sessionMeta",
    "composerActions",
    "starterPrompts",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
