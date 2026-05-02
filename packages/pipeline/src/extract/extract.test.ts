import type { Article } from "@techmato/types";
import { describe, expect, it } from "vitest";
import { extractArticleContent, extractFullContent } from "./extract.js";

const baseArticle: Article = {
  source: "Example",
  title: "Example article",
  url: "https://example.com/story",
  summary: "RSS summary fallback",
  publishedAt: new Date("2026-05-02T04:00:00.000Z"),
};

describe("extractArticleContent", () => {
  it("extracts readable article text from HTML", async () => {
    const fetchHtml = async () => `<!doctype html>
      <html>
        <head><title>Example article</title></head>
        <body>
          <article>
            <h1>Example article</h1>
            <p>This paragraph contains the useful article body.</p>
            <p>Another paragraph gives enough context for summarization.</p>
          </article>
        </body>
      </html>`;

    await expect(extractArticleContent(baseArticle, { fetchHtml })).resolves.toContain(
      "useful article body",
    );
  });

  it("falls back to RSS summary when extraction fails", async () => {
    const fetchHtml = async () => {
      throw new Error("blocked");
    };

    await expect(extractArticleContent(baseArticle, { fetchHtml })).resolves.toBe(
      "RSS summary fallback",
    );
  });
});

describe("extractFullContent", () => {
  it("adds extracted content to every article", async () => {
    const fetchHtml = async () => "<article><p>Extracted article body for testing.</p></article>";

    await expect(extractFullContent([baseArticle], { fetchHtml })).resolves.toEqual([
      {
        ...baseArticle,
        content: "Extracted article body for testing.",
      },
    ]);
  });
});
