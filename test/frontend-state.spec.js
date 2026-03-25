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
      title: "代码方案",
      description: "从需求出发拆分实现步骤、边界和风险。",
      prompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
    },
    0,
  );

  assert.deepEqual(normalized, {
    title: "代码方案",
    description: "从需求出发拆分实现步骤、边界和风险。",
    prompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
  });
});

test("normalizeStarterPrompt keeps legacy string prompts compatible", () => {
  assert.equal(typeof app.normalizeStarterPrompt, "function");

  const normalized = app.normalizeStarterPrompt(
    "请把这段内容总结成要点、结论和行动项。",
    1,
  );

  assert.deepEqual(normalized, {
    title: "示例 2",
    description: "请把这段内容总结成要点、结论和行动项。",
    prompt: "请把这段内容总结成要点、结论和行动项。",
  });
});

test("structured starter prompt cards keep plain prompt text through render and click helpers", () => {
  assert.equal(typeof app.buildStarterPromptButtonModel, "function");
  assert.equal(typeof app.readStarterPromptSelection, "function");

  const buttonModel = app.buildStarterPromptButtonModel(
    {
      title: "代码方案",
      description: "从需求出发拆分实现步骤、边界和风险。",
      prompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
    },
    0,
  );

  assert.deepEqual(buttonModel, {
    title: "代码方案",
    description: "从需求出发拆分实现步骤、边界和风险。",
    dataPrompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
  });
  assert.equal(
    app.readStarterPromptSelection({
      dataset: { prompt: buttonModel.dataPrompt },
    }),
    "请基于这个需求给出实现方案、边界条件和可能风险。",
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

test("getSessionStatus reset copy matches the personal playground tone", () => {
  assert.deepEqual(getSessionStatus({ phase: "reset" }), {
    tone: "idle",
    message: "已清空当前会话，可以开始新的任务。",
  });
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
