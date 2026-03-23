import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("project exposes required app entry files", () => {
  for (const file of [
    "package.json",
    "wrangler.jsonc",
    "src/worker.js",
    "public/index.html",
    "public/styles.css",
    "public/app.js",
  ]) {
    assert.equal(fs.existsSync(file), true, `${file} should exist`);
  }
});
