import test from "node:test";
import assert from "node:assert/strict";
import * as app from "../public/app.js";
import {
  formatAssistantTurnLabel,
  getControlState,
  getSessionStatus,
} from "../public/lib/ui-state.js";

test("formatModelLabel adds clear speed and cost hints", () => {
  assert.equal(
    app.formatModelLabel({
      label: "GLM-4.7-Flash",
      speedTag: "Fast",
      costTag: "Balanced",
    }),
    "GLM-4.7-Flash · Fast · Balanced",
  );
});

test("normalizeStarterPrompt returns button-safe text for structured prompt cards", () => {
  assert.equal(typeof app.normalizeStarterPrompt, "function");

  const normalized = app.normalizeStarterPrompt(
    {
      title: "售前演示",
      description: "生成一段适合客户沟通的产品介绍",
      prompt: "帮我写一段适合售前演示的产品介绍文案。",
    },
    0,
  );

  assert.deepEqual(normalized, {
    title: "售前演示",
    description: "生成一段适合客户沟通的产品介绍",
    prompt: "帮我写一段适合售前演示的产品介绍文案。",
  });
});

test("normalizeStarterPrompt keeps legacy string prompts compatible", () => {
  assert.equal(typeof app.normalizeStarterPrompt, "function");

  const normalized = app.normalizeStarterPrompt(
    "请用简洁的方式介绍一下这个产品能帮客户解决什么问题。",
    1,
  );

  assert.deepEqual(normalized, {
    title: "示例 2",
    description: "请用简洁的方式介绍一下这个产品能帮客户解决什么问题。",
    prompt: "请用简洁的方式介绍一下这个产品能帮客户解决什么问题。",
  });
});

test("structured starter prompt cards keep plain prompt text through render and click helpers", () => {
  assert.equal(typeof app.buildStarterPromptButtonModel, "function");
  assert.equal(typeof app.readStarterPromptSelection, "function");

  const buttonModel = app.buildStarterPromptButtonModel(
    {
      title: "售前演示",
      description: "生成一段适合客户沟通的产品介绍",
      prompt: "帮我写一段适合售前演示的产品介绍文案。",
    },
    0,
  );

  assert.deepEqual(buttonModel, {
    title: "售前演示",
    description: "生成一段适合客户沟通的产品介绍",
    dataPrompt: "帮我写一段适合售前演示的产品介绍文案。",
  });
  assert.equal(
    app.readStarterPromptSelection({
      dataset: { prompt: buttonModel.dataPrompt },
    }),
    "帮我写一段适合售前演示的产品介绍文案。",
  );
});

test("getControlState locks model and reset controls during generation", () => {
  assert.deepEqual(getControlState({ isSending: true, hasHistory: true }), {
    sendDisabled: true,
    inputDisabled: true,
    modelDisabled: true,
    resetDisabled: true,
  });
});

test("getSessionStatus labels interrupted partial generations as warnings", () => {
  assert.deepEqual(
    getSessionStatus({ phase: "interrupted", hasPartialContent: true }),
    { tone: "warning", message: "生成已中断，已保留部分内容。" },
  );
});

test("formatAssistantTurnLabel keeps request-start model visible for assistant turns", () => {
  assert.equal(
    formatAssistantTurnLabel({
      streaming: true,
      modelLabel: "GLM-4.7-Flash",
      fallbackLabel: "10:30",
    }),
    "GLM-4.7-Flash · 生成中",
  );
  assert.equal(
    formatAssistantTurnLabel({
      streaming: false,
      modelLabel: "GLM-4.7-Flash",
      fallbackLabel: "10:30",
    }),
    "GLM-4.7-Flash",
  );
  assert.equal(
    formatAssistantTurnLabel({
      streaming: false,
      modelLabel: "",
      fallbackLabel: "10:30",
    }),
    "10:30",
  );
});
