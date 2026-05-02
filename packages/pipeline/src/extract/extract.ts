import { Readability } from "@mozilla/readability";
import type { Article } from "@techmato/types";
import { JSDOM } from "jsdom";

const USER_AGENT = "techmato/1.0 (+https://github.com/Latencius)";
const DEFAULT_TIMEOUT_MS = 10_000;

type ExtractOptions = {
  fetchHtml?: (url: string) => Promise<string>;
};

async function defaultFetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractArticleContent(
  article: Article,
  options: ExtractOptions = {},
): Promise<string> {
  try {
    const html = await (options.fetchHtml ?? defaultFetchHtml)(article.url);
    const dom = new JSDOM(html, { url: article.url });
    const parsed = new Readability(dom.window.document).parse();
    const text = parsed?.textContent?.trim();

    return text || article.summary;
  } catch {
    return article.summary;
  }
}

export async function extractFullContent(
  articles: Article[],
  options: ExtractOptions = {},
): Promise<Article[]> {
  return Promise.all(
    articles.map(async (article) => ({
      ...article,
      content: await extractArticleContent(article, options),
    })),
  );
}
