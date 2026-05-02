import { describe, expect, it } from "vitest";
import { fetchAllSources, fetchSourceArticles } from "./fetch.js";
import type { NewsSource } from "./registry.js";

describe("fetchSourceArticles", () => {
  it("maps RSS items into normalized articles and respects maxArticles", async () => {
    const source: NewsSource = {
      id: "example",
      name: "Example Source",
      rssUrl: "https://example.com/feed.xml",
      language: "en",
      priority: "high",
      enabled: true,
      maxArticles: 1,
    };
    const parser = {
      parseURL: async () => ({
        items: [
          {
            title: "First item",
            link: "https://example.com/first",
            contentSnippet: "Snippet",
            isoDate: "2026-05-02T03:00:00.000Z",
          },
          {
            title: "Second item",
            link: "https://example.com/second",
            contentSnippet: "Other snippet",
            isoDate: "2026-05-02T02:00:00.000Z",
          },
        ],
      }),
    };

    const articles = await fetchSourceArticles(source, parser);

    expect(articles).toEqual([
      {
        source: "Example Source",
        title: "First item",
        url: "https://example.com/first",
        summary: "Snippet",
        publishedAt: new Date("2026-05-02T03:00:00.000Z"),
      },
    ]);
  });

  it("skips RSS items missing a title, URL, or publication date", async () => {
    const source: NewsSource = {
      id: "example",
      name: "Example Source",
      rssUrl: "https://example.com/feed.xml",
      language: "en",
      priority: "high",
      enabled: true,
    };
    const parser = {
      parseURL: async () => ({
        items: [
          { title: "Missing URL", isoDate: "2026-05-02T03:00:00.000Z" },
          { link: "https://example.com/missing-title", isoDate: "2026-05-02T03:00:00.000Z" },
          { title: "Missing date", link: "https://example.com/missing-date" },
        ],
      }),
    };

    await expect(fetchSourceArticles(source, parser)).resolves.toEqual([]);
  });
});

describe("fetchAllSources", () => {
  it("reports the failing source id when a source fetch fails", async () => {
    const sources: NewsSource[] = [
      {
        id: "openai",
        name: "OpenAI",
        rssUrl: "https://example.com/openai.xml",
        language: "en",
        priority: "high",
        enabled: true,
      },
    ];
    const parser = {
      parseURL: async () => {
        throw new Error("Status code 404");
      },
    };

    const result = await fetchAllSources(sources, new Date("2026-05-03T00:00:00.000Z"), parser);

    expect(result).toEqual({
      articles: [],
      failures: [
        {
          source: "openai",
          error: "Status code 404",
        },
      ],
    });
  });
});
