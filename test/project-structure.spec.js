import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("project exposes required app entry files", () => {
  for (const file of [
    "package.json",
    "wrangler.jsonc",
    "scripts/dev.js",
    "scripts/preview.js",
    "src/worker.js",
    "public/index.html",
    "public/styles.css",
    "public/app.js",
  ]) {
    assert.equal(fs.existsSync(file), true, `${file} should exist`);
  }
});

test("package.json exposes stable local and remote dev scripts", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.equal(pkg.scripts.dev, "node ./scripts/dev.js local");
  assert.equal(pkg.scripts["dev:remote"], "node ./scripts/dev.js remote");
  assert.equal(pkg.scripts["dev:ui"], "node ./scripts/preview.js");
});

test("dev launcher isolates wrangler config and inspector ports", () => {
  const script = fs.readFileSync("scripts/dev.js", "utf8");

  assert.match(script, /\.wrangler\/config/);
  assert.match(script, /WRANGLER_SEND_METRICS/);
  assert.match(script, /9230/);
  assert.match(script, /9231/);
  assert.match(script, /--show-interactive-dev-session=false/);
  assert.match(script, /dev:ui|preview/i);
});
