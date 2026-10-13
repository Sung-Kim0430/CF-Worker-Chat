import test from "node:test";
import assert from "node:assert/strict";
import { resolveTheme, readThemePreference, saveThemePreference } from "../public/lib/appearance.js";

test("appearance resolves explicit preferences and follows system for unknown preferences", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("invalid", false), "light");
});

test("appearance tolerates blocked storage and persists a valid preference", () => {
  const storage = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  assert.equal(readThemePreference(storage), "system");
  assert.equal(saveThemePreference(storage, "dark"), false);
  const saved = [];
  assert.equal(saveThemePreference({ setItem: (...args) => saved.push(args) }, "dark"), true);
  assert.deepEqual(saved, [["cf-worker-chat.theme.v1", "dark"]]);
  assert.equal(readThemePreference({ getItem: () => "unknown" }), "system");
});
