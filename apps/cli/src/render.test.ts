import type { Article, BroadcastScript, MergeResult, Selection } from "@techmato/pipeline";
import { describe, expect, it } from "vitest";
import {
  buildSegmentMetadata,
  formatSegmentsJson,
  formatStoriesJson,
  renderScriptText,
} from "./render.js";

const generatedAt = new Date("2026-05-02T08:30:00.000Z");

const articleOne: Article = {
  source: "Source A",
  title: "Story one",
  url: "https://example.com/one",
  summary: "Summary one",
  content: "Content one ".repeat(80),
  publishedAt: new Date("2026-05-02T06:00:00.000Z"),
};

const articleTwo: Article = {
  source: "Source B",
  title: "Story two",
  url: "https://example.com/two",
  summary: "Summary two",
  content: "Content two",
  publishedAt: new Date("2026-05-02T07:00:00.000Z"),
};

const articles: Article[] = [articleOne, articleTwo];

const selections: Selection[] = [
  {
    article: articleOne,
    reason: "実務で有用",
  },
  {
    article: articleTwo,
    reason: "独自性あり",
  },
];

const script: BroadcastScript = {
  opening: "こんにちは。本日のニュースです。",
  segments: [
    {
      title: "Story one",
      url: "https://example.com/one",
      narration: "ナレーション本文一。",
    },
  ],
  closing: "以上、本日のニュースでした。",
};

describe("renderScriptText", () => {
  it("renders a readable plain text script", () => {
    expect(renderScriptText(script, generatedAt, 62.3)).toBe(
      [
        "techmato broadcast",
        "generated: 2026-05-02T17:30:00+09:00",
        "total: 1 segments / 約 62.3秒",
        "",
        "[opening]",
        "こんにちは。本日のニュースです。",
        "",
        "[1] Story one",
        "https://example.com/one",
        "ナレーション本文一。",
        "",
        "[closing]",
        "以上、本日のニュースでした。",
      ].join("\n"),
    );
  });
});

describe("buildSegmentMetadata", () => {
  it("matches script segments to enriched articles by URL", () => {
    expect(buildSegmentMetadata(script, articles)).toEqual({
      ok: true,
      value: [
        {
          title: "Story one",
          url: "https://example.com/one",
          source: "Source A",
        },
      ],
    });
  });

  it("returns missing_article_match when a script URL is not enriched", () => {
    const result = buildSegmentMetadata(
      {
        ...script,
        segments: [{ title: "Missing", url: "https://example.com/missing", narration: "body" }],
      },
      articles,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        type: "missing_article_match",
        message: "No enriched article matched script segment URL: https://example.com/missing",
        url: "https://example.com/missing",
      },
    });
  });

  it("allows the script to include fewer stories than enriched articles", () => {
    const result = buildSegmentMetadata(script, articles);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });
});

describe("formatStoriesJson", () => {
  it("formats selected stories with preview and script inclusion", () => {
    const formatted = formatStoriesJson(selections, script.segments, generatedAt);

    expect(formatted).toEqual({
      selectedAt: "2026-05-02T17:30:00+09:00",
      stories: [
        {
          title: "Story one",
          url: "https://example.com/one",
          source: "Source A",
          publishedAt: "2026-05-02T06:00:00.000Z",
          summary: "Summary one",
          contentPreview: articleOne.content?.slice(0, 500),
          selectionReason: "実務で有用",
          includedInScript: true,
        },
        {
          title: "Story two",
          url: "https://example.com/two",
          source: "Source B",
          publishedAt: "2026-05-02T07:00:00.000Z",
          summary: "Summary two",
          contentPreview: "Content two",
          selectionReason: "独自性あり",
          includedInScript: false,
        },
      ],
    });
  });
});

describe("formatSegmentsJson", () => {
  it("formats merge result for Phase 1 playback metadata", () => {
    const mergeResult: MergeResult = {
      audioPath: "C:/tmp/broadcast.wav",
      totalDurationSec: 62.3,
      segments: [
        {
          title: "Story one",
          url: "https://example.com/one",
          source: "Source A",
          startSec: 1.8,
          endSec: 17.4,
        },
      ],
    };

    expect(formatSegmentsJson("2026-05-02T17-30-00", mergeResult, generatedAt)).toEqual({
      id: "2026-05-02T17-30-00",
      audioFile: "broadcast.wav",
      audioUrl: "broadcast.wav",
      durationSec: 62.3,
      generatedAt: "2026-05-02T17:30:00+09:00",
      segments: mergeResult.segments,
    });
  });
});
