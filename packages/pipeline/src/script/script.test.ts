import type { Article, BroadcastScript } from "@techmato/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMessageMock } = vi.hoisted(() => ({
  createMessageMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = {
      create: createMessageMock,
    };
  },
}));

import { generateScript } from "./script.js";

const articles: Article[] = [
  {
    source: "Source A",
    title: "First story",
    url: "https://example.com/first",
    summary: "First summary",
    content: "First extracted article body",
    publishedAt: new Date("2026-05-02T04:00:00.000Z"),
  },
  {
    source: "Source B",
    title: "Second story",
    url: "https://example.com/second",
    summary: "Second summary",
    content: "Second extracted article body",
    publishedAt: new Date("2026-05-02T03:00:00.000Z"),
  },
];

const validScript: BroadcastScript = {
  opening: "こんにちは。本日のニュースです。",
  segments: [
    {
      title: "First story",
      url: "https://example.com/first",
      narration: "ひとつ目のニュース本文です。重要な発表を短く伝えます。",
    },
    {
      title: "Second story",
      url: "https://example.com/second",
      narration: "続いて、ふたつ目のニュースです。開発者向けの更新です。",
    },
  ],
  closing: "以上、本日のニュースでした。",
};

function longScript(length: number): BroadcastScript {
  const opening = "こんにちは。";
  const closing = "以上です。";

  return {
    opening,
    segments: [
      {
        title: "Long story",
        url: "https://example.com/long",
        narration: "あ".repeat(length - opening.length - closing.length),
      },
    ],
    closing,
  };
}

function mockText(text: string) {
  createMessageMock.mockResolvedValueOnce({
    content: [{ type: "text", text }],
  });
}

describe("generateScript", () => {
  beforeEach(() => {
    createMessageMock.mockReset();
  });

  it("returns a script when the generated length is within range", async () => {
    mockText(JSON.stringify(validScript));

    const result = await generateScript(articles, new Date("2026-05-02T05:00:00.000Z"));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(validScript);
    expect(createMessageMock).toHaveBeenCalledTimes(1);
    expect(createMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        temperature: 0.5,
        output_config: {
          format: expect.objectContaining({
            type: "json_schema",
            schema: expect.any(Object),
          }),
        },
      }),
    );
  });

  it("retries once with the shortening prompt when the first script is too long", async () => {
    const initial = longScript(460);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(initial) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(validScript) }] });

    const result = await generateScript(articles);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(validScript);
    expect(createMessageMock).toHaveBeenCalledTimes(2);
    expect(createMessageMock.mock.calls[1]?.[0].messages[0].content).toContain("目標の450文字");
  });

  it("returns a length_violation error when retry is still too long", async () => {
    const first = longScript(460);
    const second = longScript(470);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] });

    const result = await generateScript(articles);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected length violation");
    }
    expect(result.error).toEqual(
      expect.objectContaining({
        type: "length_violation",
        actual: 470,
        limit: 450,
      }),
    );
  });

  it("accepts short-mode scripts between 401 and 450 characters", async () => {
    const script = longScript(410);
    mockText(JSON.stringify(script));

    const result = await generateScript(articles);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(script);
    expect(createMessageMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a short-mode retry below the relaxed upper bound", async () => {
    const first = longScript(460);
    const second = longScript(440);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] });

    const result = await generateScript(articles);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(second);
  });

  it("returns invalid_response for malformed JSON", async () => {
    mockText("not json");

    const result = await generateScript(articles);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected malformed JSON to fail");
    }
    expect(result.error.type).toBe("invalid_response");
  });

  it("parses JSON fenced in a markdown code block", async () => {
    mockText(`\`\`\`json\n${JSON.stringify(validScript)}\n\`\`\``);

    const result = await generateScript(articles);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(validScript);
  });

  it("replaces CURRENT_TIME and STORIES_JSON in the prompt", async () => {
    mockText(JSON.stringify(validScript));

    await generateScript(articles, new Date("2026-05-02T05:00:00.000Z"));

    const request = createMessageMock.mock.calls[0]?.[0];
    const userPrompt = request.messages[0].content;

    expect(userPrompt).toContain("現在時刻: 14時)");
    expect(userPrompt).not.toContain("14時時");
    expect(userPrompt).toContain('"title": "First story"');
    expect(userPrompt).toContain('"content": "First extracted article body"');
    expect(userPrompt).not.toContain('"summary": "First summary"');
  });

  it("accepts a long-mode script within the long length range", async () => {
    const longValid = longScript(1900);
    mockText(JSON.stringify(longValid));

    const result = await generateScript(articles, new Date("2026-05-02T05:00:00.000Z"), "long");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(longValid);
    expect(createMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 4096,
      }),
    );
    expect(createMessageMock.mock.calls[0]?.[0].messages[0].content).toContain(
      "各 segment 600字程度",
    );
  });

  it("retries long-mode scripts with the long shortening prompt", async () => {
    const first = longScript(2300);
    const second = longScript(1800);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] });

    const result = await generateScript(articles, new Date(), "long");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(second);
    expect(createMessageMock.mock.calls[1]?.[0].messages[0].content).toContain("1700〜2200字");
  });

  it("returns length_violation when long-mode retry is still too long", async () => {
    const first = longScript(2300);
    const second = longScript(2400);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] });

    const result = await generateScript(articles, new Date(), "long");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected long length violation");
    }
    expect(result.error).toEqual(
      expect.objectContaining({
        type: "length_violation",
        actual: 2400,
        limit: 2200,
      }),
    );
  });
});
