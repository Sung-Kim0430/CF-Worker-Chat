export const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";

export const APP_CONFIG = {
  title: "Workers AI 多模型助手",
  subtitle: "默认适配 GLM-4.7-Flash，适合演示、客服与知识问答场景。",
  inputHint: "Enter 发送，Shift+Enter 换行。建议一次只问一个重点问题。",
  starterPrompts: [
    "请用简洁的方式介绍一下这个产品能帮客户解决什么问题。",
    "帮我写一段适合售前演示的产品介绍文案。",
    "请总结 Cloudflare Workers AI 的优势，并给出适用场景。",
  ],
};

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

export function buildClientConfig() {
  return {
    ...APP_CONFIG,
    defaultModel: DEFAULT_MODEL,
    models: getEnabledModels(),
  };
}
