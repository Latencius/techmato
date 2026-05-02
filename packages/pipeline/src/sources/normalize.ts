import type { Article } from "@techmato/types";

const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAMS = new Set(["fbclid", "gclid"]);

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  for (const key of [...url.searchParams.keys()]) {
    if (
      TRACKING_PARAMS.has(key) ||
      TRACKING_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      url.searchParams.delete(key);
    }
  }

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function filterRecentArticles(
  articles: Article[],
  now: Date = new Date(),
  windowHours = 24,
): Article[] {
  const earliest = now.getTime() - windowHours * 60 * 60 * 1000;

  return articles.filter((article) => article.publishedAt.getTime() >= earliest);
}

export function dedupeArticles(articles: Article[]): Article[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: Article[] = [];

  for (const article of articles) {
    const urlKey = normalizeUrl(article.url);
    const titleKey = normalizeTitle(article.title);

    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) {
      continue;
    }

    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    unique.push(article);
  }

  return unique;
}
