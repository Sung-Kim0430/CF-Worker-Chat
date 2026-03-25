import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("README documents setup, models, and deployment", () => {
  const readme = fs.readFileSync("README.md", "utf8");

  for (const phrase of [
    "GLM-4.7-Flash",
    "Workers AI",
    "npm run dev",
    "wrangler deploy",
    "/api/config",
  ]) {
    assert.match(readme, new RegExp(phrase));
  }
});

test("README mentions the personal AI playground experience", () => {
  const readme = fs.readFileSync("README.md", "utf8");
  assert.match(readme, /AI Playground/i);
});
