import type { Article } from "@techmato/types";
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

import { selectArticles } from "./select.js";

const articles: Article[] = [
  {
    source: "Source A",
    title: "First story",
    url: "https://example.com/first",
    summary: "First summary",
    content: "Full text should not be sent",
    publishedAt: new Date("2026-05-02T04:00:00.000Z"),
  },
  {
    source: "Source B",
    title: "Second story",
    url: "https://example.com/second",
    summary: "Second summary",
    publishedAt: new Date("2026-05-02T03:00:00.000Z"),
  },
  {
    source: "Source C",
    title: "Third story",
    url: "https://example.com/third",
    summary: "Third summary",
    publishedAt: new Date("2026-05-02T02:00:00.000Z"),
  },
];

describe("selectArticles", () => {
  beforeEach(() => {
    createMessageMock.mockReset();
  });

  it("returns selected articles with reasons and sends only summary-level fields", async () => {
    createMessageMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            selected: [
              { index: 1, reason: "実務で有用" },
              { index: 0, reason: "影響が大きい" },
            ],
          }),
        },
      ],
    });

    const result = await selectArticles(articles, 2);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual([
      { article: articles[1], reason: "実務で有用" },
      { article: articles[0], reason: "影響が大きい" },
    ]);
    expect(createMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        temperature: 0.4,
        output_config: {
          format: expect.objectContaining({
            type: "json_schema",
            schema: expect.any(Object),
          }),
        },
      }),
    );

    const request = createMessageMock.mock.calls[0]?.[0];
    expect(request.system).toContain("ニュース編集者");
    expect(request.messages[0].content).toContain('"summary": "First summary"');
    expect(request.messages[0].content).not.toContain("Full text should not be sent");
    expect(
      request.output_config.format.schema.properties.selected.items.properties.reason.maxLength,
    ).toBe(20);
  });

  it("skips duplicate and out-of-range indexes with warnings", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createMessageMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            selected: [
              { index: 0, reason: "first" },
              { index: 10, reason: "invalid" },
              { index: 0, reason: "duplicate" },
              { index: 2, reason: "third" },
            ],
          }),
        },
      ],
    });

    const result = await selectArticles(articles, 4);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual([
      { article: articles[0], reason: "first" },
      { article: articles[2], reason: "third" },
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("returns an error for malformed JSON", async () => {
    createMessageMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json" }],
    });

    const result = await selectArticles(articles, 2);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected malformed JSON to fail");
    }
    expect(result.error.type).toBe("invalid_response");
  });

  it("returns an error when all selections are empty or invalid", async () => {
    createMessageMock.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify({ selected: [{ index: 99, reason: "bad" }] }) },
      ],
    });

    const result = await selectArticles(articles, 1);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected empty selection to fail");
    }
    expect(result.error.type).toBe("empty_selection");
  });

  it("parses JSON fenced in a markdown code block", async () => {
    createMessageMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '```json\n{"selected":[{"index":2,"reason":"注目"}]}\n```',
        },
      ],
    });

    const result = await selectArticles(articles, 1);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual([{ article: articles[2], reason: "注目" }]);
  });

  it("uses the long-form selection prompt when mode is long", async () => {
    createMessageMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            selected: [{ index: 1, reason: "深掘り向き" }],
          }),
        },
      ],
    });

    const result = await selectArticles(articles, 3, "long");

    expect(result.isOk()).toBe(true);
    const request = createMessageMock.mock.calls[0]?.[0];
    expect(request.messages[0].content).toContain("深掘りに耐える記事");
    expect(request.messages[0].content).toContain("3件");
  });
});
