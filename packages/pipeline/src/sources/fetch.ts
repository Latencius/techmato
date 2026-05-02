import type { Article } from "@techmato/types";
import Parser from "rss-parser";
import { dedupeArticles, filterRecentArticles } from "./normalize.js";
import { type NewsSource, SOURCES } from "./registry.js";

type RssItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
};

type RssParserLike = {
  parseURL(url: string): Promise<{ items?: RssItem[] }>;
};

export async function fetchSourceArticles(
  source: NewsSource,
  parser: RssParserLike = new Parser(),
): Promise<Article[]> {
  const feed = await parser.parseURL(source.rssUrl);
  const items = feed.items ?? [];

  return items.slice(0, source.maxArticles).flatMap((item) => {
    if (!item.title || !item.link) {
      return [];
    }

    const dateValue = item.isoDate ?? item.pubDate;

    if (!dateValue) {
      return [];
    }

    const publishedAt = new Date(dateValue);

    if (Number.isNaN(publishedAt.getTime())) {
      return [];
    }

    return [
      {
        source: source.name,
        title: item.title,
        url: item.link,
        summary: item.contentSnippet ?? item.summary ?? item.content ?? "",
        publishedAt,
      },
    ];
  });
}

export async function fetchAllSources(
  sources: NewsSource[] = SOURCES,
  now: Date = new Date(),
  parser: RssParserLike = new Parser(),
): Promise<{ articles: Article[]; failures: { source: string; error: string }[] }> {
  const enabledSources = sources.filter((source) => source.enabled);
  const results = await Promise.all(
    enabledSources.map(async (source) => {
      try {
        return {
          source,
          articles: await fetchSourceArticles(source, parser),
        };
      } catch (error) {
        return {
          source,
          error,
        };
      }
    }),
  );

  const articles: Article[] = [];
  const failures: { source: string; error: string }[] = [];

  for (const result of results) {
    if ("articles" in result) {
      articles.push(...result.articles);
    } else {
      failures.push({
        source: result.source.id,
        error: result.error instanceof Error ? result.error.message : String(result.error),
      });
    }
  }

  return {
    articles: dedupeArticles(filterRecentArticles(articles, now, 24)),
    failures,
  };
}
