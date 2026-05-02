import { describe, expect, it } from "vitest";
import { dedupeArticles, filterRecentArticles, normalizeUrl } from "./normalize.js";

describe("normalizeUrl", () => {
  it("removes tracking parameters and trailing slashes", () => {
    expect(normalizeUrl("https://example.com/story/?utm_source=x&ref=home")).toBe(
      "https://example.com/story?ref=home",
    );
  });
});

describe("filterRecentArticles", () => {
  it("keeps only articles published within the requested window", () => {
    const now = new Date("2026-05-02T04:00:00.000Z");
    const articles = [
      {
        source: "Example",
        title: "Fresh",
        url: "https://example.com/fresh",
        summary: "",
        publishedAt: new Date("2026-05-01T05:00:00.000Z"),
      },
      {
        source: "Example",
        title: "Old",
        url: "https://example.com/old",
        summary: "",
        publishedAt: new Date("2026-05-01T03:59:59.000Z"),
      },
    ];

    expect(filterRecentArticles(articles, now, 24).map((article) => article.title)).toEqual([
      "Fresh",
    ]);
  });
});

describe("dedupeArticles", () => {
  it("deduplicates by normalized URL and normalized title", () => {
    const publishedAt = new Date("2026-05-02T04:00:00.000Z");
    const articles = [
      {
        source: "A",
        title: "Same Story",
        url: "https://example.com/story/?utm_campaign=x",
        summary: "first",
        publishedAt,
      },
      {
        source: "B",
        title: "same story",
        url: "https://example.com/story",
        summary: "duplicate",
        publishedAt,
      },
      {
        source: "C",
        title: "Same Story",
        url: "https://example.com/other",
        summary: "duplicate by title",
        publishedAt,
      },
      {
        source: "D",
        title: "Different Story",
        url: "https://example.com/different",
        summary: "kept",
        publishedAt,
      },
    ];

    expect(dedupeArticles(articles).map((article) => article.source)).toEqual(["A", "D"]);
  });
});
