export type NewsSource = {
  id: string;
  name: string;
  rssUrl: string;
  language: "en" | "ja";
  priority: "high" | "medium" | "low";
  enabled: boolean;
  maxArticles?: number;
};

export const SOURCES: NewsSource[] = [
  {
    id: "hackernews",
    name: "Hacker News",
    rssUrl: "https://hnrss.org/frontpage",
    language: "en",
    priority: "high",
    enabled: true,
    maxArticles: 30,
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    rssUrl: "https://techcrunch.com/feed/",
    language: "en",
    priority: "high",
    enabled: true,
    maxArticles: 20,
  },
  {
    id: "theverge",
    name: "The Verge",
    rssUrl: "https://www.theverge.com/rss/index.xml",
    language: "en",
    priority: "medium",
    enabled: true,
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    rssUrl: "https://feeds.arstechnica.com/arstechnica/index",
    language: "en",
    priority: "medium",
    enabled: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    rssUrl: "https://www.anthropic.com/news/rss.xml",
    language: "en",
    priority: "high",
    enabled: false,
  },
  {
    id: "openai",
    name: "OpenAI",
    rssUrl: "https://openai.com/blog/rss.xml",
    language: "en",
    priority: "high",
    enabled: false,
  },
  {
    id: "github",
    name: "GitHub Blog",
    rssUrl: "https://github.blog/feed/",
    language: "en",
    priority: "medium",
    enabled: true,
  },
  {
    id: "publickey",
    name: "Publickey",
    rssUrl: "https://www.publickey1.jp/atom.xml",
    language: "ja",
    priority: "medium",
    enabled: true,
  },
];
