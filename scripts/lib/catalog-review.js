// The official catalog renders each model as a card with stable data attributes.
export function parseOfficialModelCatalog(html) {
  const models = [];
  for (const card of html.matchAll(/<[^>]+\bdata-models-cell\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...card[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
    if (attrs["data-model-id"]) {
      models.push({
        id: attrs["data-model-id"],
        task: attrs["data-facet-tasks"] || "",
        capabilities: (attrs["data-facet-capabilities"] || "").split("|").filter(Boolean),
      });
    }
  }
  if (!models.length) throw new Error("Official catalog did not contain model cards; review its format before updating models.");
  return models;
}

export function parseActiveModelVariants(markdown) {
  const section = markdown.split(/#{2,6} Variants that remain active/)[1]?.split(/\n#{2,6} /)[0] || "";
  return [...section.matchAll(/`(@(?:cf|hf)\/[^`]+)`/g)].map((match) => match[1]);
}

export function compareModelCatalog(official, local, activeVariants = []) {
  const officialIds = new Set(official.map((model) => model.id));
  const localIds = new Set(local.map((model) => model.id));
  const active = new Set(activeVariants);
  return {
    missingModelIds: local.filter((model) => !officialIds.has(model.id) && !active.has(model.id)).map((model) => model.id),
    activeVariantIds: local.filter((model) => !officialIds.has(model.id) && active.has(model.id)).map((model) => model.id),
    newTextGenerationModelIds: official.filter((model) => model.task === "Text Generation" && !localIds.has(model.id)).map((model) => model.id),
  };
}
