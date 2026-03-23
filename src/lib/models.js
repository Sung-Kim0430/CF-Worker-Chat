export const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";

const MODELS = [
  {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM-4.7-Flash",
    description: "通用场景默认模型，适合快速对话与演示。",
    contextWindow: 131072,
    speedTag: "Fast",
    costTag: "Balanced",
    recommendedFor: "演示、客服、多轮问答",
    enabled: true,
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fast",
    label: "Llama 3.1 8B Fast",
    description: "更轻量的快速模型，适合低延迟基础问答。",
    contextWindow: 131072,
    speedTag: "Fast",
    costTag: "Lower",
    recommendedFor: "轻量问答、快速试用",
    enabled: true,
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B Fast",
    description: "能力更强的模型，适合更复杂的生成任务。",
    contextWindow: 131072,
    speedTag: "Stronger",
    costTag: "Higher",
    recommendedFor: "复杂生成、质量优先",
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
