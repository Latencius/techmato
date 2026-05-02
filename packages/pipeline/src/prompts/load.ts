import { readFile } from "node:fs/promises";

export type PromptSection = {
  system?: string | undefined;
  user: string;
};

type PlaceholderValues = Record<string, string>;

export function renderPromptTemplate(template: string, values: PlaceholderValues): string {
  return template.replace(/\{([A-Z0-9_]+)\}/g, (match, key: string) => values[key] ?? match);
}

export async function loadPromptSection(
  filePath: string,
  h2Title: string,
  values: PlaceholderValues,
): Promise<PromptSection> {
  const markdown = await readFile(filePath, "utf8");
  const section = extractH2Section(markdown, h2Title);
  const user = extractCodeBlockAfterHeading(section, "User");

  if (!user) {
    throw new Error(`Prompt section "${h2Title}" is missing a User block`);
  }

  const system = extractCodeBlockAfterHeading(section, "System");

  return {
    system: system ? renderPromptTemplate(system, values) : undefined,
    user: renderPromptTemplate(user, values),
  };
}

function extractH2Section(markdown: string, h2Title: string): string {
  const escapedTitle = escapeRegExp(h2Title);
  const startPattern = new RegExp(`^##\\s+${escapedTitle}\\s*$`, "m");
  const startMatch = startPattern.exec(markdown);

  if (!startMatch?.index) {
    if (startMatch?.index !== 0) {
      throw new Error(`Prompt section "${h2Title}" was not found`);
    }
  }

  const startIndex = startMatch.index + startMatch[0].length;
  const rest = markdown.slice(startIndex);
  const nextH2Match = /^##\s+/m.exec(rest);

  return nextH2Match ? rest.slice(0, nextH2Match.index) : rest;
}

function extractCodeBlockAfterHeading(section: string, heading: string): string | undefined {
  const escapedHeading = escapeRegExp(heading);
  const pattern = new RegExp(
    `^###\\s+${escapedHeading}\\s*\\r?\\n\`\`\`\\r?\\n([\\s\\S]*?)\\r?\\n\`\`\``,
    "m",
  );
  const match = pattern.exec(section);

  return match?.[1]?.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
