export const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";

export const APP_CONFIG = {
  title: "Personal AI Playground",
  subtitle: "一个面向写作、编码、总结与探索的个人 AI 入口。",
  inputHint: "Enter 发送，Shift+Enter 换行。建议一次只处理一个任务。",
  workspaceBadges: [
    { label: "Streaming", tone: "success" },
    { label: "GLM 4.7", tone: "info" },
    { label: "AI Playground", tone: "neutral" },
  ],
  starterPrompts: [
    {
      title: "整理思路",
      description: "把一个模糊想法整理成清晰提纲。",
      prompt: "请把这个想法整理成一页结构化提纲，并给出下一步建议。",
    },
    {
      title: "代码方案",
      description: "从需求出发拆分实现步骤、边界和风险。",
      prompt: "请基于这个需求给出实现方案、边界条件和可能风险。",
    },
    {
      title: "内容总结",
      description: "快速提炼重点、结论和行动项。",
      prompt: "请把这段内容总结成要点、结论和行动项。",
    },
  ],
};

const MODELS = [
  {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM-4.7-Flash",
    description: "默认模型，适合高频对话、草稿整理和日常探索。",
    contextWindow: 131072,
    speedTag: "Fast",
    costTag: "Balanced",
    recommendedFor: "写作、总结、多轮对话",
    enabled: true,
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fast",
    label: "Llama 3.1 8B Fast",
    description: "更轻量的快速模型，适合短问题、草稿和轻量推理。",
    contextWindow: 131072,
    speedTag: "Fast",
    costTag: "Lower",
    recommendedFor: "轻量问答、快速试用、短文本处理",
    enabled: true,
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B Fast",
    description: "能力更强的模型，适合复杂生成、重写和更长链路任务。",
    contextWindow: 131072,
    speedTag: "Stronger",
    costTag: "Higher",
    recommendedFor: "复杂生成、质量优先、深度改写",
    enabled: true,
  },
];

export function getEnabledModels() {
  return MODELS.filter((model) => model.enabled);
}

export function getModelById(modelId) {
  return getEnabledModels().find((model) => model.id === modelId) ?? null;
}

export function isSupportedModel(modelId) {
  return getModelById(modelId) !== null;
}

export function buildClientConfig() {
  return {
    ...APP_CONFIG,
    defaultModel: DEFAULT_MODEL,
    models: getEnabledModels(),
  };
}
