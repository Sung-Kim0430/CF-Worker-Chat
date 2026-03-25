import {
  DEFAULT_MODEL,
  getFeaturedModels,
  getModelCatalog,
} from "../src/lib/models.js";

const OFFICIAL_URLS = {
  overview: "https://developers.cloudflare.com/workers-ai/",
  models: "https://developers.cloudflare.com/workers-ai/models/",
  pricing: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
};

const maintenanceChecklist = [
  "Review the official Workers AI catalog before each significant UI or model iteration.",
  "Prefer newly added chat-capable text-generation models that fit the existing chat flow.",
  "Keep the primary surface clean: show only 4-5 常用模型 and move the rest into 更多模型.",
  "Verify model metadata includes provider, taskType, streaming support, and function-calling support where relevant.",
  "Run npm test, npm run check:models, and a local chat smoke test before shipping changes.",
];

function buildSummary() {
  const catalog = getModelCatalog();
  const featured = getFeaturedModels();

  return {
    generatedAt: new Date().toISOString(),
    defaultModel: DEFAULT_MODEL,
    featuredCount: featured.length,
    catalogCount: catalog.length,
    featuredModelIds: featured.map((model) => model.id),
    officialUrls: OFFICIAL_URLS,
    maintenanceChecklist,
    models: catalog.map((model) => ({
      id: model.id,
      label: model.label,
      provider: model.provider,
      family: model.family,
      featured: model.featured,
      taskType: model.taskType,
      inputMode: model.inputMode,
      supportsStreaming: model.supportsStreaming,
      supportsFunctionCalling: model.supportsFunctionCalling,
      supportsReasoning: model.supportsReasoning,
      recommendedFor: model.recommendedFor,
    })),
  };
}

function printHumanReadable(summary) {
  const lines = [
    "CF Worker Chat model catalog review",
    "",
    `Default model : ${summary.defaultModel}`,
    `Featured      : ${summary.featuredCount}`,
    `Catalog       : ${summary.catalogCount}`,
    "",
    "Official references:",
    `- Overview: ${summary.officialUrls.overview}`,
    `- Models  : ${summary.officialUrls.models}`,
    `- Pricing : ${summary.officialUrls.pricing}`,
    "",
    "Featured models:",
    ...summary.models
      .filter((model) => model.featured)
      .map((model) => `- ${model.label} (${model.id})`),
    "",
    "Maintenance checklist:",
    ...summary.maintenanceChecklist.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Catalog snapshot:",
    ...summary.models.map(
      (model) =>
        `- ${model.label} | ${model.provider} | ${model.taskType} | ${model.supportsStreaming ? "stream" : "no-stream"} | ${model.supportsFunctionCalling ? "tools" : "no-tools"}`,
    ),
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

const summary = buildSummary();

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  printHumanReadable(summary);
}
