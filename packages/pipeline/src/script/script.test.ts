import type { Article, BroadcastScript } from "@techmato/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressEvent } from "../broadcast/progressEvents.js";

const { anthropicConstructorMock, createMessageMock } = vi.hoisted(() => ({
  anthropicConstructorMock: vi.fn(),
  createMessageMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    constructor(options: unknown) {
      anthropicConstructorMock(options);
    }

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
const TEST_API_KEY = `sk-ant-${"a".repeat(101)}`;

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

function mockText(text: string): void {
  createMessageMock.mockResolvedValueOnce({
    content: [{ type: "text", text }],
  });
}

function mockScript(script: BroadcastScript): void {
  mockText(JSON.stringify(script));
}

describe("generateScript", () => {
  beforeEach(() => {
    anthropicConstructorMock.mockReset();
    createMessageMock.mockReset();
  });

  it("returns a script when the generated length is within range", async () => {
    mockScript(validScript);

    const result = await generateScript(
      articles,
      new Date("2026-05-02T05:00:00.000Z"),
      "short",
      TEST_API_KEY,
    );

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
    expect(anthropicConstructorMock).toHaveBeenCalledWith({ apiKey: TEST_API_KEY });
  });

  it("retries with the shortening prompt when the first script is too long", async () => {
    const warnings: ProgressEvent[] = [];
    const initial = longScript(460);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(initial) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(validScript) }] });

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY, {
      onProgress: (event) => warnings.push(event),
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(validScript);
    expect(createMessageMock).toHaveBeenCalledTimes(2);
    expect(createMessageMock.mock.calls[1]?.[0].messages[0].content).toContain("450");
    expect(warnings).toEqual([
      {
        type: "warn",
        stage: "script",
        message: "script too long (460 chars), retrying 1/2",
      },
    ]);
  });

  it("retries a second time when the first shortened script is still too long", async () => {
    const first = longScript(460);
    const second = longScript(470);
    const third = longScript(440);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(third) }] });

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(third);
    expect(createMessageMock).toHaveBeenCalledTimes(3);
    expect(createMessageMock.mock.calls[2]?.[0].messages[0].content).toContain("450");
  });

  it("returns a length_violation error when both shorten retries are still too long", async () => {
    const first = longScript(460);
    const second = longScript(470);
    const third = longScript(480);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(third) }] });

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected length violation");
    }
    expect(result.error).toEqual(
      expect.objectContaining({
        type: "length_violation",
        actual: 480,
        limit: 450,
      }),
    );
  });

  it("accepts short-mode scripts between 401 and 450 characters", async () => {
    const script = longScript(410);
    mockScript(script);

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

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

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(second);
  });

  it("returns invalid_response for malformed JSON", async () => {
    mockText("not json");

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected malformed JSON to fail");
    }
    expect(result.error.type).toBe("invalid_response");
  });

  it("parses JSON fenced in a markdown code block", async () => {
    mockText(`\`\`\`json\n${JSON.stringify(validScript)}\n\`\`\``);

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(validScript);
  });

  it("strips control markers from opening text", async () => {
    mockScript({
      ...validScript,
      opening: "Opening. [NEWS_BREAK]",
    });

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value.opening).toBe("Opening.");
  });

  it("strips multiple control markers from segment narration", async () => {
    mockScript({
      ...validScript,
      segments: [
        {
          title: "First story",
          url: "https://example.com/first",
          narration: "Body. [NEWS_BREAK] Next. [NEWS_BREAK]",
        },
      ],
    });

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value.segments[0]?.narration).toBe("Body. Next.");
  });

  it("strips other uppercase control markers from generated text", async () => {
    mockScript({
      ...validScript,
      closing: "[BREAK] Closing. [SECTION] [PAUSE_5S]",
    });

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value.closing).toBe("Closing.");
  });

  it("keeps Japanese bracketed text in narration", async () => {
    mockScript({
      ...validScript,
      segments: [
        {
          title: "First story",
          url: "https://example.com/first",
          narration: "通常の[テスト]文です。[NEWS_BREAK]",
        },
      ],
    });

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value.segments[0]?.narration).toBe("通常の[テスト]文です。");
  });

  it("checks script length after removing control markers", async () => {
    const scriptWithMarkerPadding: BroadcastScript = {
      opening: "",
      segments: [
        {
          title: "Marker padded story",
          url: "https://example.com/marker-padded",
          narration: `${"a".repeat(430)} ${"[NEWS_BREAK] ".repeat(20)}`,
        },
      ],
      closing: "",
    };
    mockScript(scriptWithMarkerPadding);

    const result = await generateScript(articles, new Date(), "short", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value.segments[0]?.narration).toBe("a".repeat(430));
    expect(createMessageMock).toHaveBeenCalledTimes(1);
  });

  it("replaces CURRENT_TIME and STORIES_JSON in the prompt", async () => {
    mockScript(validScript);

    await generateScript(articles, new Date("2026-05-02T05:00:00.000Z"), "short", TEST_API_KEY);

    const request = createMessageMock.mock.calls[0]?.[0];
    const userPrompt = request.messages[0].content;

    expect(userPrompt).toContain("14");
    expect(userPrompt).toContain('"title": "First story"');
    expect(userPrompt).toContain('"content": "First extracted article body"');
    expect(userPrompt).not.toContain('"summary": "First summary"');
  });

  it("accepts a long-mode script within the long length range", async () => {
    const longValid = longScript(1900);
    mockScript(longValid);

    const result = await generateScript(
      articles,
      new Date("2026-05-02T05:00:00.000Z"),
      "long",
      TEST_API_KEY,
    );

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
    expect(createMessageMock.mock.calls[0]?.[0].messages[0].content).toContain("600");
  });

  it("retries long-mode scripts with the long shortening prompt", async () => {
    const first = longScript(2300);
    const second = longScript(1800);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] });

    const result = await generateScript(articles, new Date(), "long", TEST_API_KEY);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual(second);
    expect(createMessageMock.mock.calls[1]?.[0].messages[0].content).toContain("2200");
  });

  it("returns length_violation when long-mode retries are still too long", async () => {
    const first = longScript(2300);
    const second = longScript(2400);
    const third = longScript(2500);
    createMessageMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(first) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(second) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(third) }] });

    const result = await generateScript(articles, new Date(), "long", TEST_API_KEY);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected long length violation");
    }
    expect(result.error).toEqual(
      expect.objectContaining({
        type: "length_violation",
        actual: 2500,
        limit: 2200,
      }),
    );
  });
});
