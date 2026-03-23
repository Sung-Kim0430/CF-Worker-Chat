import test from "node:test";
import assert from "node:assert/strict";
import { formatModelLabel } from "../public/app.js";

test("formatModelLabel adds clear speed and cost hints", () => {
  assert.equal(
    formatModelLabel({
      label: "GLM-4.7-Flash",
      speedTag: "Fast",
      costTag: "Balanced",
    }),
    "GLM-4.7-Flash · Fast · Balanced",
  );
});
