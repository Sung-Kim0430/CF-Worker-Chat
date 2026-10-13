export function buildSessionExport(session = {}) {
  const title = String(session.title || "新对话").replace(/[\r\n]+/g, " ");
  const filename = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/[.\s]+$/g, "")
    .slice(0, 80) || "对话";
  const turns = (session.history || [])
    .filter((item) => item.includeInHistory !== false && item.content?.trim())
    .map((item) => {
      const label = item.role === "user" ? "你" : item.modelLabel || item.modelId || "AI 助手";
      return `### ${String(label).replace(/[\r\n]+/g, " ")}\n\n${item.content}`;
    });
  return {
    filename: `${filename}.md`,
    content: [`# ${title}`, `模型：${session.modelId || "Workers AI"}`, ...turns].join("\n\n") + "\n",
  };
}
