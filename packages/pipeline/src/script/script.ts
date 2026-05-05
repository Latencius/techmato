import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { Article, BroadcastScript, ScriptSegment } from "@techmato/types";
import { err, ok, type Result } from "neverthrow";
import { BROADCAST_MODES, type BroadcastMode } from "../broadcast/mode.js";
import type { ProgressEvent } from "../broadcast/progressEvents.js";
import { DEFAULT_PROMPTS_PATH, loadPromptSection } from "../prompts/load.js";

const MODEL = "claude-sonnet-4-6";
const MAX_SHORTEN_RETRIES = 2;

export type ScriptError =
  | { type: "api_error"; message: string; cause?: unknown }
  | { type: "invalid_response"; message: string }
  | { type: "length_violation"; message: string; actual: number; limit: number };

type MessageContentBlock = {
  type: string;
  text?: string;
};

export type GenerateScriptOptions = {
  onProgress?: (event: ProgressEvent) => void;
};

export async function generateScript(
  articles: Article[],
  now: Date = new Date(),
  mode: BroadcastMode = "short",
  options: GenerateScriptOptions = {},
): Promise<Result<BroadcastScript, ScriptError>> {
  try {
    const config = BROADCAST_MODES[mode];
    const maxTokens = mode === "long" ? 4096 : 2048;
    const firstPrompt = await loadPromptSection(DEFAULT_PROMPTS_PATH, config.scriptPromptKey, {
      CURRENT_TIME: formatJstHour(now),
      STORIES_JSON: JSON.stringify(toPromptStories(articles), null, 2),
    });
    const firstScriptResult = await requestScript(firstPrompt.system, firstPrompt.user, maxTokens);

    if (!firstScriptResult) {
      return err({
        type: "invalid_response",
        message: "Claude returned malformed script JSON",
      });
    }

    const firstLength = countScriptCharacters(firstScriptResult);

    if (firstLength < config.scriptMin) {
      console.warn(`Generated script is shorter than expected: ${firstLength} characters`);
    }

    if (firstLength <= config.scriptMax) {
      return ok(firstScriptResult);
    }

    let currentScript = firstScriptResult;
    let currentLength = firstLength;

    for (let attempt = 1; attempt <= MAX_SHORTEN_RETRIES; attempt += 1) {
      options.onProgress?.({
        type: "warn",
        stage: "script",
        message: `script too long (${currentLength} chars), retrying ${attempt}/${MAX_SHORTEN_RETRIES}`,
      });
      const retryPrompt = await loadPromptSection(DEFAULT_PROMPTS_PATH, config.shortenPromptKey, {
        CHAR_COUNT: String(currentLength),
        SCRIPT_JSON: JSON.stringify(currentScript, null, 2),
        TARGET_MAX: String(config.scriptMax),
      });
      const retryScriptResult = await requestScript(
        retryPrompt.system,
        retryPrompt.user,
        maxTokens,
      );

      if (!retryScriptResult) {
        return err({
          type: "invalid_response",
          message: "Claude returned malformed shortened script JSON",
        });
      }

      currentScript = retryScriptResult;
      currentLength = countScriptCharacters(retryScriptResult);

      if (currentLength <= config.scriptMax) {
        if (currentLength < config.scriptMin) {
          console.warn(`Generated script is shorter than expected: ${currentLength} characters`);
        }

        return ok(currentScript);
      }
    }

    return err({
      type: "length_violation",
      message: `Generated script is ${currentLength} characters, exceeding ${config.scriptMax}`,
      actual: currentLength,
      limit: config.scriptMax,
    });
  } catch (cause) {
    return err({
      type: "api_error",
      message: cause instanceof Error ? cause.message : "Failed to generate script",
      cause,
    });
  }
}

async function requestScript(
  system: string | undefined,
  user: string,
  maxTokens: number,
): Promise<BroadcastScript | undefined> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const request: MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.5,
    messages: [{ role: "user", content: user }],
    output_config: {
      format: {
        type: "json_schema",
        schema: scriptSchema,
      },
    },
  };

  if (system) {
    request.system = system;
  }

  const message = await anthropic.messages.create(request);

  return parseScriptResponse(extractText(message.content));
}

function toPromptStories(articles: Article[]) {
  return articles.map((article) => ({
    title: article.title,
    url: article.url,
    content: article.content ?? "",
  }));
}

function formatJstHour(now: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "0";

  return `${hour}時`;
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

function parseScriptResponse(text: string): BroadcastScript | undefined {
  try {
    const parsed = JSON.parse(stripJsonFence(text)) as Partial<BroadcastScript>;

    if (
      typeof parsed.opening !== "string" ||
      typeof parsed.closing !== "string" ||
      !Array.isArray(parsed.segments)
    ) {
      return undefined;
    }

    const segments = parseSegments(parsed.segments);

    if (!segments) {
      return undefined;
    }

    return {
      opening: parsed.opening,
      segments,
      closing: parsed.closing,
    };
  } catch {
    return undefined;
  }
}

function parseSegments(segments: unknown[]): ScriptSegment[] | undefined {
  const parsedSegments: ScriptSegment[] = [];

  for (const segment of segments) {
    if (
      typeof segment !== "object" ||
      segment === null ||
      !("title" in segment) ||
      !("url" in segment) ||
      !("narration" in segment) ||
      typeof segment.title !== "string" ||
      typeof segment.url !== "string" ||
      typeof segment.narration !== "string"
    ) {
      return undefined;
    }

    parsedSegments.push({
      title: segment.title,
      url: segment.url,
      narration: segment.narration,
    });
  }

  return parsedSegments;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);

  return fenced?.[1]?.trim() ?? trimmed;
}

function countScriptCharacters(script: BroadcastScript): number {
  return (
    script.opening.length +
    script.segments.reduce((sum, segment) => sum + segment.narration.length, 0) +
    script.closing.length
  );
}

const scriptSchema = {
  type: "object",
  additionalProperties: false,
  required: ["opening", "segments", "closing"],
  properties: {
    opening: { type: "string" },
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "narration"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          narration: { type: "string" },
        },
      },
    },
    closing: { type: "string" },
  },
};
