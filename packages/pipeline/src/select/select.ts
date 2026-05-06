import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { Article } from "@techmato/types";
import { err, ok, type Result } from "neverthrow";
import { BROADCAST_MODES, type BroadcastMode } from "../broadcast/mode.js";
import { DEFAULT_PROMPTS_PATH, loadPromptSection } from "../prompts/load.js";

const MODEL = "claude-sonnet-4-6";

export type Selection = {
  article: Article;
  reason: string;
};

export type SelectError = {
  type: "api_error" | "invalid_response" | "empty_selection";
  message: string;
  cause?: unknown;
};

type ClaudeSelection = {
  index: number;
  reason: string;
};

type ClaudeSelectionResponse = {
  selected: ClaudeSelection[];
};

type MessageContentBlock = {
  type: string;
  text?: string;
};

export async function selectArticles(
  articles: Article[],
  count = 4,
  mode: BroadcastMode = "short",
  apiKey: string,
): Promise<Result<Selection[], SelectError>> {
  try {
    const prompt = await loadPromptSection(
      DEFAULT_PROMPTS_PATH,
      BROADCAST_MODES[mode].selectPromptKey,
      {
        N: String(count),
        ARTICLES_JSON: JSON.stringify(toPromptArticles(articles), null, 2),
      },
    );
    const anthropic = new Anthropic({ apiKey });
    const request: MessageCreateParamsNonStreaming = {
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt.user }],
      output_config: {
        format: {
          type: "json_schema",
          schema: selectionSchema,
        },
      },
    };

    if (prompt.system) {
      request.system = prompt.system;
    }

    const message = await anthropic.messages.create(request);
    const parsed = parseSelectionResponse(extractText(message.content));

    if (!parsed) {
      return err({
        type: "invalid_response",
        message: "Claude returned malformed selection JSON",
      });
    }

    const selections = resolveSelections(articles, parsed.selected);

    if (selections.length === 0) {
      return err({
        type: "empty_selection",
        message: "Claude did not return any usable article selections",
      });
    }

    return ok(selections);
  } catch (cause) {
    return err({
      type: "api_error",
      message: cause instanceof Error ? cause.message : "Failed to select articles",
      cause,
    });
  }
}

function toPromptArticles(articles: Article[]) {
  return articles.map((article, index) => ({
    index,
    source: article.source,
    title: article.title,
    url: article.url,
    summary: article.summary,
  }));
}

function extractText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block: MessageContentBlock) => (block.type === "text" ? (block.text ?? "") : ""))
    .join("\n")
    .trim();
}

function parseSelectionResponse(text: string): ClaudeSelectionResponse | undefined {
  try {
    const parsed = JSON.parse(stripJsonFence(text)) as Partial<ClaudeSelectionResponse>;

    if (!Array.isArray(parsed.selected)) {
      return undefined;
    }

    const selected = parsed.selected.flatMap((selection) => {
      if (
        typeof selection?.index !== "number" ||
        !Number.isInteger(selection.index) ||
        typeof selection.reason !== "string"
      ) {
        return [];
      }

      return [{ index: selection.index, reason: selection.reason }];
    });

    return { selected };
  } catch {
    return undefined;
  }
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);

  return fenced?.[1]?.trim() ?? trimmed;
}

function resolveSelections(articles: Article[], selected: ClaudeSelection[]): Selection[] {
  const seen = new Set<number>();
  const selections: Selection[] = [];

  for (const selection of selected) {
    if (selection.index < 0 || selection.index >= articles.length) {
      console.warn(`Skipping out-of-range selected article index: ${selection.index}`);
      continue;
    }

    if (seen.has(selection.index)) {
      console.warn(`Skipping duplicate selected article index: ${selection.index}`);
      continue;
    }

    seen.add(selection.index);
    const article = articles[selection.index];

    if (!article) {
      console.warn(`Skipping missing selected article index: ${selection.index}`);
      continue;
    }

    selections.push({
      article,
      reason: selection.reason,
    });
  }

  return selections;
}

const selectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["selected"],
  properties: {
    selected: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "reason"],
        properties: {
          index: { type: "integer" },
          reason: { type: "string", maxLength: 20 },
        },
      },
    },
  },
};
