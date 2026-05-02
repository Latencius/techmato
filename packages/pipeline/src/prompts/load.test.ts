import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PROMPTS_PATH, loadPromptSection, renderPromptTemplate } from "./load.js";

const markdown = `# Prompts

## 1. 記事選定プロンプト

Intro text.

### System
\`\`\`
System for {N} stories.
\`\`\`

### User
\`\`\`
Pick {N} from {ARTICLES_JSON}.
\`\`\`

### パラメータ
- Model: \`claude-sonnet-4-6\`

---

## 2. 台本生成プロンプト

### User
\`\`\`
Other prompt
\`\`\`
`;

describe("renderPromptTemplate", () => {
  it("replaces placeholders by name", () => {
    expect(renderPromptTemplate("Pick {N}: {ARTICLES_JSON}", { N: "4", ARTICLES_JSON: "[]" })).toBe(
      "Pick 4: []",
    );
  });
});

describe("loadPromptSection", () => {
  it("exports the default prompts path used at runtime", async () => {
    const prompts = await readFile(DEFAULT_PROMPTS_PATH, "utf8");

    expect(prompts).toContain("## 1. 記事選定プロンプト");
    expect(prompts).toContain("## 2. 台本生成プロンプト");
  });

  it("cuts out a H2 section and extracts System/User code blocks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "techmato-prompts-"));
    const filePath = join(dir, "PROMPTS.md");
    await writeFile(filePath, markdown, "utf8");

    const prompt = await loadPromptSection(filePath, "1. 記事選定プロンプト", {
      N: "3",
      ARTICLES_JSON: '[{"title":"Example"}]',
    });

    expect(prompt).toEqual({
      system: "System for 3 stories.",
      user: 'Pick 3 from [{"title":"Example"}].',
    });
  });

  it("handles a section whose H2 starts at file index 0", async () => {
    const dir = await mkdtemp(join(tmpdir(), "techmato-prompts-"));
    const filePath = join(dir, "PROMPTS.md");
    await writeFile(filePath, "## Foo\n\n### User\n```\nbody\n```", "utf8");

    const prompt = await loadPromptSection(filePath, "Foo", {});

    expect(prompt).toEqual({
      system: undefined,
      user: "body",
    });
  });

  it("returns undefined for a missing System block", async () => {
    const dir = await mkdtemp(join(tmpdir(), "techmato-prompts-"));
    const filePath = join(dir, "PROMPTS.md");
    await writeFile(filePath, markdown, "utf8");

    const prompt = await loadPromptSection(filePath, "2. 台本生成プロンプト", {});

    expect(prompt).toEqual({
      system: undefined,
      user: "Other prompt",
    });
  });
});
